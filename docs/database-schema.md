# Database schema

PostgreSQL 16, managed with Alembic (`backend/alembic/versions`). Current head revision: `f1fad1bbb6eb`. This page was written from the live database (`\d users`, `\d analyses`) after applying the migrations; a test (`test_migrations_match_the_models` in `backend/tests/test_schema.py`) fails if the models and migrations drift apart.

```
users 1 ───── * analyses
 id (PK)         id (PK)
 email (unique)  user_id (FK → users.id, ON DELETE CASCADE)
 ...             ...
```

## `users`

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | no | generated in the application (uuid4) | Primary key. |
| `email` | varchar(254) | no | | Lower-cased by the API. Unique index `ix_users_email`. |
| `full_name` | varchar(120) | yes | | Optional display name. |
| `password_hash` | varchar(255) | no | | bcrypt hash; the plain password is never stored. |
| `is_active` | boolean | no | set by the application (true) | Inactive users cannot sign in or use tokens. |
| `created_at`, `updated_at` | timestamptz | no | set by the application (UTC) | |
| `token_version` | integer | no | `0` | Incremented on password change; tokens carry the value they were issued with, so older tokens stop working. |

## `analyses`

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `id` | uuid | no | Primary key. |
| `user_id` | uuid | no | Owner. Foreign key to `users.id`, `ON DELETE CASCADE` (deleting an account deletes its analyses). |
| `title` | varchar(300) | yes | Headline, or the extracted page title for URL analyses. |
| `text` | text | no | The analysed text (at most 20,000 characters). |
| `word_count` | integer | no | Denormalised for the history list. |
| `classifier_label` | varchar(40) | no | `resembles_unreliable_sources` or `resembles_reliable_sources`. |
| `probability_unreliable` | double precision | no | Model probability for the "unreliable" label (not factual certainty). |
| `uncertainty_level` | varchar(20) | no | `moderate`, `high` or `very_high`. |
| `result` | jsonb | no | The full analysis response as returned to the user (classification, signals, evidence, uncertainty, source). Records saved by older versions may lack newer fields; the API fills defaults when reading them. |
| `created_at` | timestamptz | no | UTC. |

Index `ix_analyses_user_created (user_id, created_at)` serves the newest-first history listing.

## Migrations

| Revision | Description |
| --- | --- |
| `6033cd3736f3` | Create `users` and `analyses`. |
| `f1fad1bbb6eb` | Add `users.token_version`. |

Apply with `python -m alembic upgrade head` (the Docker backend does this on start). The reference passages, evaluation sets and model files are not in the database; see [dataset-and-model.md](dataset-and-model.md) and [analysis-api.md](analysis-api.md).
