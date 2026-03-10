import { topRolesData } from "./data/top_roles.js";

const state = {
  roles: [],
  filteredRoles: [],
  selectedRole: null,
  visibleCount: 20,
};

const PAGE_SIZE = 20;

const elements = {
  heroCount: document.querySelector("#heroCount"),
  selectedName: document.querySelector("#selectedName"),
  rosterGrid: document.querySelector("#rosterGrid"),
  detailName: document.querySelector("#detailName"),
  detailAliases: document.querySelector("#detailAliases"),
  detailDescription: document.querySelector("#detailDescription"),
  summaryProgressThumb: document.querySelector("#summaryProgressThumb"),
  detailEventCount: document.querySelector("#detailEventCount"),
  detailTraitCount: document.querySelector("#detailTraitCount"),
  traitList: document.querySelector("#traitList"),
  eventList: document.querySelector("#eventList"),
  searchInput: document.querySelector("#searchInput"),
  loadMoreButton: document.querySelector("#loadMoreButton"),
  rosterCardTemplate: document.querySelector("#rosterCardTemplate"),
  eventItemTemplate: document.querySelector("#eventItemTemplate"),
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function matchesQuery(role, query) {
  if (!query) {
    return true;
  }
  const bucket = [role.name, ...(role.aliases || [])].join(" ").toLowerCase();
  return bucket.includes(query.toLowerCase());
}

function updateSummaryProgress() {
  const summary = elements.detailDescription;
  const thumb = elements.summaryProgressThumb;
  const scrollable = summary.scrollHeight - summary.clientHeight;

  if (scrollable <= 0) {
    thumb.style.opacity = "0";
    thumb.style.height = "100%";
    thumb.style.transform = "translateY(0)";
    return;
  }

  const visibleRatio = Math.max(summary.clientHeight / summary.scrollHeight, 0.18);
  const thumbHeightPx = Math.max(summary.clientHeight * visibleRatio, 28);
  const maxTravel = summary.clientHeight - thumbHeightPx;
  const progress = summary.scrollTop / scrollable;

  thumb.style.opacity = "1";
  thumb.style.height = `${thumbHeightPx}px`;
  thumb.style.transform = `translateY(${maxTravel * progress}px)`;
}

function selectRole(role) {
  state.selectedRole = role;
  elements.selectedName.textContent = role.name;
  elements.detailName.textContent = role.name;
  elements.detailAliases.textContent = role.aliases.length ? `别名：${role.aliases.join(" / ")}` : "别名：暂无";
  elements.detailDescription.textContent = role.summary || role.description || "暂无角色描述。";
  elements.detailDescription.scrollTop = 0;
  elements.detailEventCount.textContent = String(role.event_count);
  elements.detailTraitCount.textContent = String(role.personality.length);

  elements.traitList.innerHTML = "";
  (role.personality.length ? role.personality : ["暂无标签"]).forEach((trait) => {
    const chip = document.createElement("span");
    chip.className = "trait-chip";
    chip.textContent = trait;
    elements.traitList.appendChild(chip);
  });

  renderEvents(role.events);
  updateSummaryProgress();
  renderRoster();
}

function renderEvents(events) {
  elements.eventList.innerHTML = "";

  if (!events.length) {
    elements.eventList.innerHTML = '<div class="empty-state">当前角色暂无可展示事件。</div>';
    return;
  }

  events.forEach((event) => {
    const fragment = elements.eventItemTemplate.content.cloneNode(true);
    fragment.querySelector(".event-index").textContent = String(event.rank).padStart(2, "0");
    fragment.querySelector(".event-title").textContent = event.title || event.event_id;
    fragment.querySelector(".event-meta").textContent = event.event_id;

    const statusNode = fragment.querySelector(".event-status");
    const decisionNode = fragment.querySelector(".event-decision");
    const resultNode = fragment.querySelector(".event-result");

    statusNode.innerHTML = `<strong>状态：</strong>${escapeHtml(event.status || "暂无")}`;
    decisionNode.innerHTML = `<strong>决策：</strong>${escapeHtml(event.decision || "暂无")}`;
    resultNode.innerHTML = `<strong>结果：</strong>${escapeHtml(event.result || "暂无")}`;

    elements.eventList.appendChild(fragment);
  });
}

function renderRoster() {
  elements.rosterGrid.innerHTML = "";

  if (!state.filteredRoles.length) {
    elements.rosterGrid.innerHTML = '<div class="empty-state">没有匹配到角色。</div>';
    elements.loadMoreButton.hidden = true;
    return;
  }

  const visibleRoles = state.filteredRoles.slice(0, state.visibleCount);

  visibleRoles.forEach((role, index) => {
    const fragment = elements.rosterCardTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".roster-card");
    card.dataset.name = role.name;
    card.classList.toggle("is-active", state.selectedRole?.name === role.name);
    card.querySelector(".card-rank").textContent = `#${String(index + 1).padStart(2, "0")}`;
    card.querySelector(".card-image").src = role.image;
    card.querySelector(".card-image").alt = `${role.name}占位图`;
    card.querySelector(".card-name").textContent = role.name;
    card.querySelector(".card-count").textContent = `${role.event_count} 个事件`;
    card.addEventListener("click", () => selectRole(role));
    elements.rosterGrid.appendChild(fragment);
  });

  elements.loadMoreButton.hidden = state.visibleCount >= state.filteredRoles.length;
}

function applyFilter() {
  const query = elements.searchInput.value.trim();
  state.filteredRoles = state.roles.filter((role) => matchesQuery(role, query));
  state.visibleCount = PAGE_SIZE;
  renderRoster();

  if (!state.filteredRoles.length) {
    elements.selectedName.textContent = "未命中";
    return;
  }

  const stillVisible = state.filteredRoles.some((role) => role.name === state.selectedRole?.name);
  if (!stillVisible) {
    selectRole(state.filteredRoles[0]);
  }
}

function bootstrap() {
  state.roles = topRolesData.roles || [];
  state.filteredRoles = [...state.roles];
  state.visibleCount = PAGE_SIZE;
  elements.heroCount.textContent = String(state.roles.length);

  if (state.roles.length) {
    selectRole(state.roles[0]);
  } else {
    renderRoster();
    renderEvents([]);
  }
}

elements.searchInput.addEventListener("input", applyFilter);
elements.loadMoreButton.addEventListener("click", () => {
  state.visibleCount += PAGE_SIZE;
  renderRoster();
});
elements.detailDescription.addEventListener("scroll", updateSummaryProgress);
window.addEventListener("resize", updateSummaryProgress);

try {
  bootstrap();
} catch {
  elements.rosterGrid.innerHTML = '<div class="empty-state">数据加载失败，请先生成前端数据文件。</div>';
  elements.eventList.innerHTML = '<div class="empty-state">暂无可用事件。</div>';
}
