"""Safe fetching and article extraction for user-supplied URLs.

The server fetches URLs on behalf of users, which is a classic SSRF risk. Defences:

* only ``http``/``https`` on the default ports (80/443), no credentials in the URL;
* the hostname is resolved by us and *every* resolved address must be globally routable
  (private, loopback, link-local, CGNAT, multicast, reserved, IPv4-mapped/6to4/Teredo/NAT64
  addresses are refused);
* the connection is made to the vetted IP address itself (TLS SNI and certificate checks still use
  the original hostname), so a second DNS answer cannot redirect the request (DNS rebinding);
* redirects are followed manually, at most ``URL_MAX_REDIRECTS`` times, and each hop is revalidated;
* environment proxy settings and cookies are ignored; no credentials are ever sent;
* only HTML/plain-text responses are accepted, capped by size and total time.

Remaining limits: a name that resolves to a public address is trusted, and the page content is
untrusted input that is only ever treated as text.
"""

from __future__ import annotations

import ipaddress
import socket
import time
from dataclasses import dataclass
from urllib.parse import urljoin, urlsplit

import httpx

from app.core.config import settings
from app.core.exceptions import VeritasException

ALLOWED_PORTS = {None, 80, 443}
ALLOWED_CONTENT_TYPES = ("text/html", "application/xhtml+xml", "text/plain")
USER_AGENT = "VERITAS-AI-ArticleFetcher/1.0 (+article analysis; no credentials)"
MAX_TEXT_CHARS = 20_000
MIN_TEXT_CHARS = 20
TOTAL_DEADLINE_SECONDS = 20.0
_NAT64 = ipaddress.ip_network("64:ff9b::/96")


class UrlRejectedException(VeritasException):
    """The URL is not acceptable (policy violation or nothing extractable)."""

    def __init__(self, message: str, code: str = "URL_REJECTED") -> None:
        super().__init__(message=message, code=code, status_code=422)


class UrlFetchFailedException(VeritasException):
    """The remote page could not be retrieved."""

    def __init__(self, message: str) -> None:
        super().__init__(message=message, code="URL_FETCH_FAILED", status_code=502)


@dataclass(frozen=True)
class ExtractedArticle:
    url: str
    final_url: str
    domain: str
    title: str | None
    text: str
    author: str | None
    published: str | None
    extracted_chars: int
    truncated: bool


# ----- address policy ---------------------------------------------------------------------------
def is_public_address(address: str) -> bool:
    """True only for globally routable unicast addresses."""
    try:
        ip = ipaddress.ip_address(address.split("%")[0])
    except ValueError:
        return False
    if isinstance(ip, ipaddress.IPv6Address):
        if ip.ipv4_mapped is not None:
            return is_public_address(str(ip.ipv4_mapped))
        if ip.sixtofour is not None or ip.teredo is not None or ip in _NAT64:
            return False
    return ip.is_global and not ip.is_multicast and not ip.is_unspecified


def resolve_public_addresses(host: str, port: int) -> list[str]:
    """Resolve ``host`` and return its addresses, refusing if any is not public."""
    try:
        infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except socket.gaierror:
        raise UrlFetchFailedException("The host name could not be resolved.") from None
    addresses = list(dict.fromkeys(info[4][0] for info in infos))
    if not addresses or not all(is_public_address(a) for a in addresses):
        raise UrlRejectedException("This URL points to a private, local or reserved address and cannot be fetched.", "URL_BLOCKED")
    return addresses


def validate_url(url: str) -> tuple[str, str, int | None]:
    """Return (scheme, hostname, explicit port) or raise UrlRejectedException."""
    if any(ch in url for ch in "\r\n\t ") or len(url) > 2048:
        raise UrlRejectedException("The URL is malformed.")
    try:
        parts = urlsplit(url)
        port = parts.port
    except ValueError:
        raise UrlRejectedException("The URL is malformed.") from None
    if parts.scheme not in ("http", "https"):
        raise UrlRejectedException("Only http and https URLs are supported.")
    if parts.username or parts.password:
        raise UrlRejectedException("URLs containing credentials are not allowed.")
    if port not in ALLOWED_PORTS:
        raise UrlRejectedException("Only the standard web ports (80 and 443) are allowed.", "URL_BLOCKED")
    host = (parts.hostname or "").rstrip(".").lower()
    if not host or host == "localhost" or host.endswith(".localhost"):
        raise UrlRejectedException("This URL points to a private, local or reserved address and cannot be fetched.", "URL_BLOCKED")
    try:
        host = host.encode("idna").decode("ascii")
    except UnicodeError:
        raise UrlRejectedException("The URL host name is invalid.") from None
    return parts.scheme, host, port


# ----- fetching ---------------------------------------------------------------------------------
def _fetch_once(client: httpx.Client, url: str, resolver, deadline: float) -> tuple[httpx.Response | None, bytes, str | None]:
    """Fetch one hop. Returns (response, body, redirect_location)."""
    scheme, host, port = validate_url(url)
    effective_port = port or (443 if scheme == "https" else 80)
    address = resolver(host, effective_port)[0]  # all addresses were vetted; connect to the first
    ip_host = f"[{address}]" if ":" in address else address
    parts = urlsplit(url)
    target = f"{scheme}://{ip_host}{':' + str(port) if port else ''}{parts.path or '/'}"
    if parts.query:
        target += f"?{parts.query}"
    host_header = host if port is None else f"{host}:{port}"

    try:
        with client.stream(
            "GET", target, headers={"Host": host_header}, extensions={"sni_hostname": host}
        ) as response:
            if response.status_code in (301, 302, 303, 307, 308):
                location = response.headers.get("location")
                if not location:
                    raise UrlFetchFailedException("The page redirected without a destination.")
                return response, b"", urljoin(url, location)
            if response.status_code != 200:
                raise UrlFetchFailedException(f"The page responded with HTTP status {response.status_code}.")
            content_type = response.headers.get("content-type", "").split(";")[0].strip().lower()
            if content_type not in ALLOWED_CONTENT_TYPES:
                raise UrlRejectedException("The URL does not point to an HTML or text page.", "URL_UNSUPPORTED_CONTENT")
            declared = response.headers.get("content-length")
            if declared and declared.isdigit() and int(declared) > settings.URL_MAX_BYTES:
                raise UrlRejectedException("The page is too large to analyze.", "URL_TOO_LARGE")
            body = bytearray()
            for chunk in response.iter_bytes():
                body.extend(chunk)
                if len(body) > settings.URL_MAX_BYTES:
                    raise UrlRejectedException("The page is too large to analyze.", "URL_TOO_LARGE")
                if time.monotonic() > deadline:
                    raise UrlFetchFailedException("The page took too long to download.")
            return response, bytes(body), None
    except httpx.TimeoutException:
        raise UrlFetchFailedException("The page took too long to respond.") from None
    except httpx.HTTPError:
        raise UrlFetchFailedException("The page could not be retrieved.") from None


def fetch_html(url: str, *, resolver=resolve_public_addresses, transport: httpx.BaseTransport | None = None) -> tuple[bytes, str]:
    """Fetch ``url`` safely and return (body bytes, final URL)."""
    deadline = time.monotonic() + TOTAL_DEADLINE_SECONDS
    client = httpx.Client(
        transport=transport,
        timeout=httpx.Timeout(settings.URL_FETCH_TIMEOUT_SECONDS),
        follow_redirects=False,
        trust_env=False,
        headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml,text/plain;q=0.8"},
    )
    current = url
    with client:
        for _ in range(settings.URL_MAX_REDIRECTS + 1):
            _, body, redirect = _fetch_once(client, current, resolver, deadline)
            if redirect is None:
                return body, current
            current = redirect
    raise UrlFetchFailedException("The page redirected too many times.")


# ----- extraction -------------------------------------------------------------------------------
def extract_article(html: bytes, url: str, final_url: str) -> ExtractedArticle:
    """Extract the main article text and metadata with trafilatura."""
    import trafilatura

    doc = trafilatura.bare_extraction(html, url=final_url, with_metadata=True, include_comments=False, favor_precision=True)
    get = (lambda key: doc.get(key)) if isinstance(doc, dict) else (lambda key: getattr(doc, key, None))
    text = (get("text") or "").strip() if doc else ""
    if len(text) < MIN_TEXT_CHARS:
        raise UrlRejectedException(
            "Could not extract article text from this page. It may be paywalled, rendered by JavaScript, or not an article.",
            "EXTRACTION_FAILED",
        )
    truncated = len(text) > MAX_TEXT_CHARS
    text = text[:MAX_TEXT_CHARS]
    domain = urlsplit(final_url).hostname or ""
    return ExtractedArticle(
        url=url, final_url=final_url, domain=domain,
        title=(get("title") or None) and str(get("title"))[:300],
        text=text,
        author=(get("author") or None) and str(get("author"))[:200],
        published=(get("date") or None) and str(get("date"))[:40],
        extracted_chars=len(text), truncated=truncated,
    )


def ingest_url(url: str, **fetch_kwargs) -> ExtractedArticle:
    """Fetch and extract an article from ``url``."""
    body, final_url = fetch_html(url.strip(), **fetch_kwargs)
    return extract_article(body, url.strip(), final_url)
