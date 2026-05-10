# Court Interpreter Scheduling

Bid scaffold for **RFP LSS-2026-207-RB** — Judicial Council of California, Court Interpreters Program.

This repository now combines two upstream projects into a single cohesive app:

| Subtree | Upstream | Role |
| --- | --- | --- |
| `web/` + `api/` | [bcgov/court-interpreter-scheduling](https://github.com/bcgov/court-interpreter-scheduling) | Original Vue 2 + FastAPI domain app — interpreter directory, ADM forms, audit reports. Re-skinned for the JCC bid. |
| `easyappointments/` | [alextselegidis/easyappointments](https://github.com/alextselegidis/easyappointments) | Vendored fork providing the booking calendar, provider/customer admin, and notification scaffolding the bcgov base was missing relative to RFP Exhibit 1. See [`easyappointments/NOTICE.md`](./easyappointments/NOTICE.md) for license + provenance. |
| `easyappointments/docker-compose.override.yml` | _(local)_ | Adds **Metabase** to the same compose stack — closes RFP §5 (reporting & analytics). Connects to EA's MySQL on the internal docker network; persists app metadata in `easyappointments/docker/metabase/` (gitignored). |
| `mock-api/` | _(local)_ | Express stub for screenshotting the Vue frontend without standing up the FastAPI backend. Dev-only. |

## Stack

```
http://localhost:8080  →  bcgov Vue dev server  (web/)
http://localhost:8082  →  mock-api Express stub (mock-api/)
http://localhost:8085  →  Easy!Appointments     (easyappointments/)
http://localhost:8086  →  phpMyAdmin            (easyappointments/)
http://localhost:8088  →  Metabase              (easyappointments/, §5 analytics)
http://localhost:8090  →  integration/auth-bridge   (Supabase JWT → downstream sessions)
http://localhost:8091  →  integration/metabase-sso  (proxy with auto-provisioning)
http://localhost:8092  →  integration/ea-sync       (replication worker; health endpoint)
http://127.0.0.1:54321 →  Supabase API              (`cd supabase && supabase start`)
http://127.0.0.1:54323 →  Supabase Studio
```

## Easy!Appointments subsystem

```bash
cd easyappointments
cp config-sample.php config.php
# edit BASE_URL = 'http://localhost:8085'
docker compose up -d nginx php-fpm mysql
docker compose exec php-fpm php index.php console install
# admin login: administrator / administrator → http://localhost:8085
```

## Original bcgov dev environment

Currently it requires: Npm 6.14.14, Node 12, Python 3.8/3.9/3.10. Running on Docker is recommended.

#### Important commands for the web folder:
`npm run-script serve` # Serve web under hot reloading
`npm run-script build` # Build production web package

###	REST API (api)
A FastApi based REST API which provides the heavy lifting.  The API includes a Swagger interface containing API documentation and UI that allows you to interact with the various APIs manually.

#### Important commands for the api folder (May require environment variables set, check settings.py):
`alembic upgrade head`
`uvicorn app:app --reload --port=8080`

#### Required Environment Variable keys (check settings.py):
`DATABASE_SERVICE_NAME, DATABASE_NAME, DATABASE_USER, DATABASE_PASSWORD, DATABASE_ENGINE, DB_SERVICE_HOST, DB_SERVICE_PORT`

### PDF Microservice (pdf)
An html to PDF microservice used to generate reports.
This can be started up by `./manage start pdf` under the docker folder (refer to Running on Docker).

###	Database (db)
A PostgreSQL database for storage.
This can be started up by `./manage start db` under the docker folder (refer to Running on Docker). Alternatively a local version could be installed on a different port than the docker container.

## Running on Docker
The project can also be run locally using Docker and Docker Compose.  Refer to [Running with Docker Compose](./docker/README.md) for instructions.

## Running on OpenShift
To deploy using a local instance of OpenShift, refer to [Running on OpenShift](./RunningOnOpenShift.md).  These instructions, apart from the steps that are specific to setting up your local environment, can be used to get the project deployed to a production OpenShift environment.

## High Level Architecture

![Court Interpreter Scheduling Application](./doc/diagrams/Court%20Interpreter%20Scheduling.drawio.svg)

## Code of Conduct
Please refer to the [Code of Conduct](./CODE_OF_CONDUCT.md)

## Contributing
For information on how to contribute, refer to [Contributing](CONTRIBUTING.md)

## License
Code released under the [Apache License, Version 2.0](./LICENSE).
