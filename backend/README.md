Runs on modern PHP, uses memcached for storage. Requires memcached and curl modules enabled in PHP.

`Tweet` function was removed and calls to it commented out.

`status.json` end point was handled by nginx by reading `mc_status` directly from memcached.
