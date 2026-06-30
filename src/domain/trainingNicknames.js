const fallbackNicknames = {
  A: ["小雨", "林夏", "阿宁", "周舟", "小禾"],
  B: ["阿杰", "老周", "小孟", "大川", "阿泽"]
};

const genericRoleNamePattern = /^(?:角色|role)\s*[ABab]$/;

export function isGenericTrainingRoleName(value) {
  return genericRoleNamePattern.test(String(value || "").trim());
}

export function trainingRoleNickname(roleKey, seed = "") {
  const key = roleKey === "B" ? "B" : "A";
  const pool = fallbackNicknames[key];
  return pool[stableIndex(`${key}:${seed}`, pool.length)];
}

export function trainingRoleDisplayName(roleKey, value, seed = "") {
  const name = String(value || "").trim();
  return name && !isGenericTrainingRoleName(name) ? name : trainingRoleNickname(roleKey, seed);
}

export function normalizeTrainingRoleName(roleKey, value, seed = "") {
  return trainingRoleDisplayName(roleKey, value, seed);
}

function stableIndex(value, size) {
  const text = String(value || "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash % size;
}
