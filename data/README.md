# Data provenance

## WELFake dataset (raw, unmodified)

| Field | Value |
| --- | --- |
| Name | WELFake dataset for fake news detection in text data |
| Source | https://zenodo.org/records/4561253 (DOI 10.5281/zenodo.4561253) |
| License | CC-BY-4.0 |
| File | `data/raw/WELFake_Dataset.csv` |
| Size | 245,086,152 bytes |
| MD5 | `73c9675a4b3d09f86a6933d0b8d7d908` (matches the checksum published by Zenodo) |
| Downloaded | 2026-11-20 from `https://zenodo.org/api/records/4561253/files/WELFake_Dataset.csv/content` |
| Rows | 72,134 |
| Columns in file | `Unnamed: 0` (serial number), `title`, `text`, `label` |

The CSV is git-ignored because of its size. The file is never modified; all cleaning happens in memory (`backend/app/ml/data.py`).

Re-download and verify:

```powershell
New-Item -ItemType Directory -Force data\raw
Invoke-WebRequest "https://zenodo.org/api/records/4561253/files/WELFake_Dataset.csv/content" -OutFile data\raw\WELFake_Dataset.csv
(Get-FileHash data\raw\WELFake_Dataset.csv -Algorithm MD5).Hash
```

Citation: Verma, P. K., Agrawal, P., Amorim, I., Prodan, R. "WELFake: Word Embedding Over Linguistic Features for Fake News Detection", IEEE Transactions on Computational Social Systems, 2021 (see the Zenodo record).

## Label discrepancy found

The dataset description states `0 = fake, 1 = real`. The distributed file does not match that:

- `label = 1` has 37,106 rows, which equals the description's *fake* count; `label = 0` has 35,028 (the description's *real* count).
- `label = 0` contains 21,266 articles with a "(Reuters)" dateline versus 16 in `label = 1`; `label = 1` is dominated by hyperpartisan and clickbait text.

VERITAS AI therefore treats **`label = 1` as fake/unreliable and `label = 0` as real**, and the code names the target `is_fake`. This was inferred from counts and content, not from an authoritative correction by the dataset authors.
