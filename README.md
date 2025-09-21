git --version
ls -la .git
[ -f .git/index.lock ] && rm -f .git/index.lock
git status
git fsck
git gc
# TimeReport_PODC
