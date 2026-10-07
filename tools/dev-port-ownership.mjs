export function takeoverTarget(ownerPid, processes, app, currentPid) {
  const chain = processChain(ownerPid, processes);
  const preflight = chain.find((entry) => isPreflightFor(entry, app));
  if (!preflight) return null;

  const stack = chain.find(
    (entry) =>
      isNodeProcess(entry) && /(?:^|[\\/\s])dev-stack\.mjs(?:\s|$)/u.test(entry.commandLine)
  );
  if (stack && !processChain(currentPid, processes).some((entry) => entry.pid === stack.pid)) {
    return stack.pid;
  }
  return preflight.pid;
}

export function previousPreflightPids(processes, app, currentPid) {
  return Array.from(processes.values())
    .filter((entry) => entry.pid !== currentPid && isPreflightFor(entry, app))
    .map((entry) => entry.pid);
}

function isPreflightFor(entry, app) {
  if (!isNodeProcess(entry)) return false;
  return new RegExp(`(?:^|[\\\\/\\s])preflight\\.mjs\\s+${app}(?:\\s|$)`, "u").test(
    entry.commandLine
  );
}

function isNodeProcess(entry) {
  return /^node(?:\.exe)?$/iu.test(entry.name);
}

function processChain(pid, processes) {
  const chain = [];
  const visited = new Set();
  let current = pid;
  while (current > 0 && !visited.has(current)) {
    visited.add(current);
    const entry = processes.get(current);
    if (!entry) break;
    chain.push(entry);
    current = entry.parentPid;
  }
  return chain;
}
