```
server {
server_name thetirupurtextiles.com www.thetirupurtextiles.com shop.thetirupurtextiles.com;

    large_client_header_buffers 8 32k;
    client_header_buffer_size 16k;

    location /storage/ {
        proxy_pass http://127.0.0.1:6005;
        proxy_set_header Host $host;
        proxy_set_header Cookie "";
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:6005;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:6005;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:6010;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/codexsun.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/codexsun.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = www.thetirupurtextiles.com) {
        return 301 https://$host$request_uri;
    }

    if ($host = thetirupurtextiles.com) {
        return 301 https://$host$request_uri;
    }
    
    if ($host = shop.thetirupurtextiles.com) {
      return 301 https://$host$request_uri;
    }

    listen 80;
    server_name thetirupurtextiles.com www.thetirupurtextiles.com shop.thetirupurtextiles.com;
    return 404; # managed by Certbot
}
```

```
sudo nginx -t
sudo systemctl reload nginx
```

sudo certbot --nginx -d sukraa.codexsun.com

## Tenant CLI

Use the repo-owned helper for repeated CXSun tenant domain setup:

```bash
python3 .container/cli/codexsun.py tirupurconnect.com --ssl --dry-run
sudo python3 .container/cli/codexsun.py tirupurconnect.com --ssl --force
```

Optional installed command:

```bash
sudo ln -sf /workspace/cxsun/.container/cli/codexsun.py /usr/local/bin/codexsun
sudo chmod +x /workspace/cxsun/.container/cli/codexsun.py
sudo codexsun tirupurconnect.com --ssl --force
```

It writes `/etc/nginx/sites-available/<domain>`, links `/etc/nginx/sites-enabled/<domain>`, tests Nginx, reloads Nginx, and can run Certbot when `--ssl` is used.
