#!/bin/sh
# Build one site and publish it, in the checkout this script sits in. Triggered
# over ssh by .github/workflows/staging-deploy.yml, which rsyncs the repo up and
# then runs deploy/script.sh from inside it, so the version that runs is always
# the one from the commit being deployed.
#
#   ./script.sh <site-key> <commit-sha>
#
# Replies at once and keeps working detached: the ssh session closes straight
# away, so the workflow is not holding a connection open for the whole build and
# a hangup cannot kill it. The workflow then waits for build-sha.txt on the live
# site to reach <commit-sha> - that, not this script's exit, is the verdict.
#
#   tail -f ~/deploy/<site-key>.log
#   kill -- "-$(cat ~/deploy/<site-key>.lock/pid)"   # stop it
#
# ~/deploy/env on the server, if present, is sourced first - that is where to
# put PATH for a Node that only an interactive login can see.

set -eu

SITE=${1:?usage: script.sh <site-key> <commit-sha>}
SHA=${2:?usage: script.sh <site-key> <commit-sha>}

# Per site: where the built files go, and the API the bundle is compiled against
# (Vite bakes it in, so the URL cannot move after the build).
case "$SITE" in
cashbookbdaccountsstaging)
	API_URL=https://staging.cashbookbd.com
	DEST=/home/cashbookbdaccountsstaging/htdocs/accounts.staging.cashbookbd.com
	;;
cashbookbdaccountseworld)
	API_URL=https://eworld.cashbookbd.com
	DEST=/home/cashbookbdaccountseworld/htdocs/accounts.eworld.cashbookbd.com
	;;
*)
	echo "unknown site: $SITE" >&2
	exit 1
	;;
esac

# A non-interactive ssh session reads neither .bashrc nor .profile, so Node put
# there by nvm or CloudPanel is not on PATH even though an interactive login
# finds it. Let the server state it once in ~/deploy/env, else go looking.
[ -r "$HOME/deploy/env" ] && . "$HOME/deploy/env"

if ! command -v npm >/dev/null 2>&1; then
	for d in "$HOME"/.nvm/versions/node/*/bin /usr/local/bin /usr/bin /opt/node/bin; do
		[ -x "$d/npm" ] && { PATH="$d:$PATH"; break; }
	done
	export PATH
fi

# Checked before the reply so a broken server fails the workflow step loudly,
# instead of dying quietly in a log nobody is tailing.
command -v npm >/dev/null 2>&1 || {
	echo "npm not on PATH for $(whoami)." >&2
	echo "Looked in: ~/.nvm/versions/node/*/bin /usr/local/bin /usr/bin /opt/node/bin" >&2
	echo "Fix: on the server, put a line like" >&2
	echo "  PATH=/path/to/node/bin:\$PATH" >&2
	echo "in ~/deploy/env (find the path with: ssh <user>@<host> 'bash -lc \"command -v npm\"')" >&2
	exit 1
}
echo "node $(node -v 2>/dev/null || echo '?') npm $(npm -v 2>/dev/null || echo '?') at $(command -v npm)"

# This project's vite needs node ^20.19 || >=22.12, and a server may well have
# an older one in /usr/bin that the search above would happily pick. Say so now
# rather than let the build die ten minutes in on a version error.
# ponytail: major version only; a 20.0-20.18 would slip through, npm's own
# engines warning catches that.
NODE_MAJOR=$(node -v 2>/dev/null | sed 's/^v//; s/\..*//')
if [ "${NODE_MAJOR:-0}" -lt 20 ] 2>/dev/null; then
	echo "node $(node -v 2>/dev/null) is too old - vite needs 20.19+ or 22.12+" >&2
	echo "Fix: install a newer node, then point ~/deploy/env at its bin dir." >&2
	exit 1
fi

[ -d "$DEST" ] || { echo "deploy dir missing: $DEST" >&2; exit 1; }

# The build happens right here, in the checkout this script came up with - not
# in some agreed-upon path on the server.
SRC=$(cd "$(dirname "$0")/.." && pwd)
[ -f "$SRC/package.json" ] || { echo "no package.json at $SRC" >&2; exit 1; }

LOCK=$HOME/deploy/$SITE.lock
LOG=$HOME/deploy/$SITE.log
export SITE SHA API_URL DEST SRC LOCK

# The lock below is a bare mkdir, so its parent has to be there already.
mkdir -p "$HOME/deploy"

# A crashed run leaves the lock behind; drop it only if its pid is really gone.
if [ -d "$LOCK" ] && ! kill -0 "$(cat "$LOCK/pid" 2>/dev/null || echo 0)" 2>/dev/null; then
	rm -rf "$LOCK"
fi

# mkdir is the lock: atomic everywhere, no flock dependency. One build per site;
# two at once would race on the same checkout and publish a half-built dist.
if ! mkdir "$LOCK" 2>/dev/null; then
	echo "$SITE: already building (pid $(cat "$LOCK/pid" 2>/dev/null || echo '?')) - not started"
	exit 1
fi

echo "$SITE: accepted $SHA, building in background, log: $LOG"

# setsid detaches from the ssh session (no SIGHUP on hangup); unset on systems
# without it, where the fd redirects alone are enough.
SETSID=$(command -v setsid 2>/dev/null || true)

# All three fds leave the ssh socket: that is what lets the reply land now.
# shellcheck disable=SC2086
$SETSID sh -c '
	trap "rm -rf \"$LOCK\"" EXIT HUP INT TERM
	echo $$ > "$LOCK/pid"
	now() { date -Is 2>/dev/null || date; }
	printf "\n=== %s  %s  %s ===\n" "$(now)" "$SITE" "$SHA"

	cd "$SRC"
	npm ci --no-audit --no-fund &&
	VITE_SITE_NAME="$SITE" VITE_API_URL="$API_URL" npm run build -- --mode production &&
	# Written last inside dist, so it only appears once the build really finished.
	# The workflow polls this file to decide the deploy landed.
	echo "$SHA" > dist/build-sha.txt &&
	rsync -a --delete dist/ "$DEST/" &&
	{ systemctl reload nginx || echo "nginx reload failed (files are published)"; }
	rc=$?

	printf "=== %s  exit %s ===\n" "$(now)" "$rc"
	exit $rc
' </dev/null >>"$LOG" 2>&1 &
