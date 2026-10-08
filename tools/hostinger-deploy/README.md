# Hostinger deployment connection

This package owns the SSH connection check for the CXSUN demo VPS. Future deploy
commands can use `HostingerSshService` after the separate demo stack exists.
The package does not store a private key or an API token.

The `HostingerSshService.runOnVerifiedHost(script)` method verifies the pinned VPS
again before it sends a script over SSH. Future demo deployment code can use this
method for a reviewed server script. The CLI does not accept arbitrary commands.

Run `npm run hostinger:status` from the repository root. The command checks the
local SSH alias, connects to the pinned VPS, verifies its identity and Docker,
and reports whether `/home/cxsun-demo` exists. It does not change the server.

Run `npm run hostinger:bootstrap` to create `/home/cxsun-demo` from the public
CXSUN repository. If the checkout already exists, the command checks its origin,
branch, and clean state. It does not overwrite an existing checkout.

Run `npm run hostinger:sync -- --ref <full-commit-sha>` to fast-forward the demo
checkout to an exact commit on `origin/main`. The command rejects a dirty tree,
a different origin, a non-forward update, or a commit outside `origin/main`.
Sync changes source only. It does not build or replace containers.

Create a local SSH alias named `cxsun-hostinger` before using this package:

```sshconfig
Host cxsun-hostinger
    HostName 69.62.81.166
    User root
    Port 22
    IdentityFile <private-key-path>
    IdentitiesOnly yes
    StrictHostKeyChecking yes
    UserKnownHostsFile <known-hosts-path>
```

The current workstation already has this alias. Its private key and known-hosts
file remain under the protected DevKit storage directory. To use another alias,
set `CXSUN_DEPLOY_SSH_ALIAS` to its name. The alias must still resolve to the
pinned VPS.

The CXSUN demo deployment needs its own checkout, database, containers, and
Cloudflare hostname. Do not use the production `/home/cxapp` checkout or its
database for the demo.
