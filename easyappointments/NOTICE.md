# Easy!Appointments — vendored fork

This subdirectory is a fork of [Easy!Appointments](https://easyappointments.org)
by Alex Tselegidis (originally hosted at <https://github.com/alextselegidis/easyappointments>).

It is included in this repository as a fork to provide the booking calendar,
provider/customer admin, and notification scaffolding that the core
`court-interpreter-scheduling` (bcgov) backend was missing relative to the
**RFP LSS-2026-207-RB Exhibit 1** requirements.

## License

Code: GPL-3.0 (inherited from upstream).
Content / docs: CC BY 3.0.

A copy of the GPL-3.0 license is in [`LICENSE`](./LICENSE) within this directory.

Any redistribution of this combined work must preserve this notice and comply
with the GPL-3.0 terms for the `easyappointments/` subdirectory.

## Provenance

- **Upstream**: <https://github.com/alextselegidis/easyappointments>
- **Snapshot taken**: 2026-05-09 from `master`
- **Vendored by**: this repository's maintainers

We've vendored rather than submoduled because the bid response will heavily
customize the schema, theme, and notification layer — diverging from upstream
faster than periodic upstream merges would tolerate cleanly. Security updates
will be cherry-picked manually.

## Run it

See [the root README](../README.md#easyappointments-subsystem) for the
combined-stack run instructions.

Solo:

```bash
cd easyappointments
cp config-sample.php config.php
# edit BASE_URL (default http://localhost:8085 per docker-compose.override.yml)
docker compose up -d nginx php-fpm mysql
docker compose exec php-fpm php index.php console install
# admin login: administrator / administrator
# open: http://localhost:8085
```
