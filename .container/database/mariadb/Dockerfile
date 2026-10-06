ARG MARIADB_BASE_IMAGE
FROM ${MARIADB_BASE_IMAGE}

ARG CXSUN_VERSION
LABEL org.opencontainers.image.title="CODEXSUN MariaDB" \
      org.opencontainers.image.version="$CXSUN_VERSION"

COPY .container/database/mariadb/50-cxsun-server.cnf /etc/mysql/mariadb.conf.d/50-cxsun-server.cnf
COPY .container/database/mariadb/10-cxsun-grants.sh /docker-entrypoint-initdb.d/10-cxsun-grants.sh
