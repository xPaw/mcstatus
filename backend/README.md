Runs on modern PHP, uses memcached for storage. Requires memcached and curl modules enabled in PHP.

`Tweet` function was removed and calls to it commented out.

`status.json` end point was handled by nginx by reading `mc_status` directly from memcached.

```nginx
location = /mcstatus/status.json {
	access_log off;

	gzip_vary on;
	gzip_types application/json;
	gzip_proxied expired no-cache no-store private;

	types { }
	default_type application/json;
	charset_types application/json;
	charset utf-8;

	limit_except GET { deny all; }

	set $memcached_key "mc_status";
	memcached_pass unix:/var/run/memcached/memcached.sock;

	error_page 404 502 504 = @realtimemiss;
}

location @realtimemiss { return 503; }
```
