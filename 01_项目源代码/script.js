
/* =========================================
   StudyFlow V2.0
   校园智能学习任务管理系统
   核心业务逻辑
========================================= */

"use strict";

// ================================
// 1. 系统配置与数据初始化
// ================================

const STORAGE_KEY = "studyflow_tasks_v1";
const THEME_KEY = "studyflow_theme_v2";

const CATEGORIES = [
    "课程学习",
    "作业任务",
    "考试备考",
    "个人计划"
];

const PRIORITIES = ["高", "中", "低"];

const PRIORITY_ORDER = {
    "高": 1,
    "中": 2,
    "低": 3
};

let tasks = loadTasks();
let currentFilter = "all";
let currentPage = "dashboard";
let editingTaskId = null;

const today = getToday();

let calendarDate = new Date();
let selectedDate = today;

// ================================
// 2. 获取页面元素
// ================================

const $ = id => document.getElementById(id);

const taskList = $("taskList");
const recentTaskList = $("recentTaskList");

const taskModal = $("taskModal");
const settingsModal = $("settingsModal");

const taskForm = $("taskForm");

const taskTitle = $("taskTitle");
const taskDescription = $("taskDescription");
const taskCategory = $("taskCategory");
const taskPriority = $("taskPriority");
const taskDeadline = $("taskDeadline");

const searchInput = $("searchInput");
const categoryFilter = $("categoryFilter");
const priorityFilter = $("priorityFilter");
const sortFilter = $("sortFilter");

// ================================
// 3. 日期处理
// ================================

function getToday() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function isValidDate(value) {
    if (typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    return date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day;
}

function formatDisplayDate(value) {
    if (!isValidDate(value)) return value;

    const [year, month, day] = value.split("-");
    return `${year}年${Number(month)}月${Number(day)}日`;
}

// ================================
// 4. 任务数据读取与保存
// ================================

function normalizeTask(task) {
    if (!task || typeof task !== "object") {
        return null;
    }

    if (
        typeof task.title !== "string" ||
        !task.title.trim() ||
        !isValidDate(task.deadline)
    ) {
        return null;
    }

    return {
        id: String(task.id || createTaskId()),
        title: task.title.trim().slice(0, 50),
        description: typeof task.description === "string"
            ? task.description.slice(0, 300)
            : "",
        category: CATEGORIES.includes(task.category)
            ? task.category
            : "个人计划",
        priority: PRIORITIES.includes(task.priority)
            ? task.priority
            : "中",
        deadline: task.deadline,
        completed: task.completed === true,
        createdAt: task.createdAt || new Date().toISOString(),
        completedAt: task.completedAt || null
    };
}

function loadTasks() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) return [];

        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) return [];

        return parsed.map(normalizeTask).filter(Boolean);

    } catch (error) {
        console.error("任务数据读取失败：", error);
        return [];
    }
}

function saveTasks() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(tasks)
        );

        return true;

    } catch (error) {
        console.error("任务数据保存失败：", error);
        alert("保存失败，请检查浏览器存储空间。");
        return false;
    }
}

function createTaskId() {
    if (window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }

    return Date.now().toString(36) +
        Math.random().toString(36).slice(2);
}

// ================================
// 5. 任务状态判断
// ================================

function isOverdue(task) {
    return !task.completed &&
        task.deadline < getToday();
}

function getTaskStatus(task) {
    if (task.completed) return "已完成";
    if (isOverdue(task)) return "已逾期";
    return "待完成";
}

// ================================
// 6. 安全创建页面元素
// ================================

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}

// ================================
// 7. 更新统计数据
// ================================

function updateStatistics() {
    const total = tasks.length;

    const completed = tasks.filter(
        task => task.completed
    ).length;

    const pending = total - completed;

    const overdue = tasks.filter(
        isOverdue
    ).length;

    const rate = total === 0
        ? 0
        : Math.round(completed / total * 100);

    $("totalCount").textContent = total;
    $("pendingCount").textContent = pending;
    $("completedCount").textContent = completed;
    $("overdueCount").textContent = overdue;

    $("analyticsRate").textContent = rate + "%";
    $("analyticsCompleted").textContent = completed;
    $("analyticsPending").textContent = pending;
    $("analyticsOverdue").textContent = overdue;

    $("progressRing").style.background =
        `conic-gradient(
            #39ad83 0% ${rate}%,
            #edf0f7 ${rate}% 100%
        )`;
}

// ================================
// 8. 分类数据图表
// ================================

function renderCategoryChart() {
    const chart = $("categoryChart");

    chart.replaceChildren();

    const colors = [
        "#6979e8",
        "#39ad83",
        "#e8a34c",
        "#a27be8"
    ];

    CATEGORIES.forEach((category, index) => {

        const count = tasks.filter(
            task => task.category === category
        ).length;

        const percentage = tasks.length === 0
            ? 0
            : Math.round(count / tasks.length * 100);

        const row = createElement("div", "category-row");

        const info = createElement("div", "category-info");

        const name = createElement("span", "", category);
        const value = createElement(
            "strong",
            "",
            `${count}项 (${percentage}%)`
        );

        info.append(name, value);

        const bar = createElement("div", "category-bar");
        const fill = createElement("div", "category-fill");

        fill.style.width = percentage + "%";
        fill.style.background = colors[index];

        bar.appendChild(fill);
        row.append(info, bar);
        chart.appendChild(row);
    });
}

// ================================
// 9. 创建任务卡片
// ================================

function createTaskCard(task) {
    const card = createElement("div", "task-card");

    if (task.completed) {
        card.classList.add("task-completed");
    }

    const info = createElement("div", "task-info");

    const title = createElement("h3", "", task.title);

    const description = createElement(
        "p",
        "",
        task.description || "暂无任务描述"
    );

    const meta = createElement("div", "task-meta");

    const category = createElement(
        "span",
        "tag",
        task.category
    );

    const priorityClass = {
        "高": "priority-high",
        "中": "priority-medium",
        "低": "priority-low"
    };

    const priority = createElement(
        "span",
        `tag ${priorityClass[task.priority]}`,
        task.priority + "优先级"
    );

    const deadline = createElement(
        "span",
        "tag",
        "截止：" + formatDisplayDate(task.deadline)
    );

    const status = createElement(
        "span",
        "tag",
        getTaskStatus(task)
    );

    meta.append(category, priority, deadline, status);
    info.append(title, description, meta);

    const actions = createElement("div", "task-actions");

    const completeBtn = createElement(
        "button",
        "",
        task.completed ? "撤销完成" : "完成"
    );

    completeBtn.addEventListener("click", () => {
        toggleTask(task.id);
    });

    const editBtn = createElement("button", "", "编辑");

    editBtn.addEventListener("click", () => {
        editTask(task.id);
    });

    const deleteBtn = createElement(
        "button",
        "delete-btn",
        "删除"
    );

    deleteBtn.addEventListener("click", () => {
        deleteTask(task.id);
    });

    actions.append(completeBtn, editBtn, deleteBtn);
    card.append(info, actions);

    return card;
}

// ================================
// 10. 空状态
// ================================

function createEmptyState(message = "暂时没有学习任务") {
    const empty = createElement("div", "empty-state");

    const icon = createElement("div", "", "📝");
    const title = createElement("h3", "", message);

    const description = createElement(
        "p",
        "",
        "试试调整筛选条件，或者创建一个新任务。"
    );

    empty.append(icon, title, description);

    return empty;
}

// ================================
// 11. 筛选和排序
// ================================

function getFilteredTasks() {
    let result = [...tasks];

    if (currentFilter === "pending") {
        result = result.filter(task => !task.completed);
    }

    if (currentFilter === "completed") {
        result = result.filter(task => task.completed);
    }

    if (currentFilter === "overdue") {
        result = result.filter(isOverdue);
    }

    const keyword = searchInput.value.trim().toLowerCase();

    if (keyword) {
        result = result.filter(task =>
            task.title.toLowerCase().includes(keyword) ||
            task.description.toLowerCase().includes(keyword)
        );
    }

    if (categoryFilter.value !== "all") {
        result = result.filter(
            task => task.category === categoryFilter.value
        );
    }

    if (priorityFilter.value !== "all") {
        result = result.filter(
            task => task.priority === priorityFilter.value
        );
    }

    if (sortFilter.value === "date") {
        result.sort((a, b) =>
            a.deadline.localeCompare(b.deadline)
        );
    } else {
        result.sort((a, b) =>
            PRIORITY_ORDER[a.priority] -
            PRIORITY_ORDER[b.priority]
        );
    }

    return result;
}

// ================================
// 12. 渲染任务列表
// ================================

function renderTaskList(container, list) {
    container.replaceChildren();

    if (list.length === 0) {
        container.appendChild(createEmptyState());
        return;
    }

    list.forEach(task => {
        container.appendChild(createTaskCard(task));
    });
}

function renderTasks() {
    const filtered = getFilteredTasks();

    renderTaskList(taskList, filtered);

    const recent = [...tasks]
        .sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt)
        )
        .slice(0, 5);

    renderTaskList(recentTaskList, recent);

    updateStatistics();
    renderCategoryChart();
}

// ================================
// 13. 新建任务
// ================================

function openAddModal() {
    editingTaskId = null;

    taskForm.reset();

    $("modalTitle").textContent = "新建学习任务";

    taskDeadline.min = getToday();

    taskModal.classList.add("show");
}

function closeTaskModal() {
    taskModal.classList.remove("show");
    taskForm.reset();
    editingTaskId = null;
}

taskForm.addEventListener("submit", event => {
    event.preventDefault();

    const title = taskTitle.value.trim();
    const description = taskDescription.value.trim();
    const category = taskCategory.value;
    const priority = taskPriority.value;
    const deadline = taskDeadline.value;

    if (!title) {
        alert("请输入任务名称！");
        taskTitle.focus();
        return;
    }

    if (title.length > 50 || description.length > 300) {
        alert("任务名称或描述长度不符合要求。");
        return;
    }

    if (!CATEGORIES.includes(category)) {
        alert("任务分类不合法。");
        return;
    }

    if (!PRIORITIES.includes(priority)) {
        alert("任务优先级不合法。");
        return;
    }

    if (!isValidDate(deadline)) {
        alert("请选择有效的截止日期！");
        return;
    }

    if (editingTaskId) {
        const task = tasks.find(
            item => item.id === editingTaskId
        );

        if (!task) {
            alert("找不到需要修改的任务。");
            return;
        }

        Object.assign(task, {
            title,
            description,
            category,
            priority,
            deadline
        });

    } else {
        tasks.push({
            id: createTaskId(),
            title,
            description,
            category,
            priority,
            deadline,
            completed: false,
            createdAt: new Date().toISOString(),
            completedAt: null
        });
    }

    if (!saveTasks()) return;

    closeTaskModal();
    renderTasks();
    renderCalendar();
});

// ================================
// 14. 编辑任务
// ================================

function editTask(id) {
    const task = tasks.find(item => item.id === id);

    if (!task) {
        alert("找不到该任务！");
        return;
    }

    editingTaskId = id;

    taskTitle.value = task.title;
    taskDescription.value = task.description;
    taskCategory.value = task.category;
    taskPriority.value = task.priority;
    taskDeadline.value = task.deadline;

    $("modalTitle").textContent = "编辑学习任务";

    taskDeadline.min = "";

    taskModal.classList.add("show");
}

// ================================
// 15. 删除任务
// ================================

function deleteTask(id) {
    const task = tasks.find(item => item.id === id);

    if (!task) return;

    if (!confirm(`确定删除任务“${task.title}”吗？`)) {
        return;
    }

    const oldTasks = tasks;

    tasks = tasks.filter(item => item.id !== id);

    if (!saveTasks()) {
        tasks = oldTasks;
        return;
    }

    renderTasks();
    renderCalendar();
}

// ================================
// 16. 完成任务
// ================================

function toggleTask(id) {
    const task = tasks.find(item => item.id === id);

    if (!task) return;

    const oldCompleted = task.completed;
    const oldCompletedAt = task.completedAt;

    task.completed = !task.completed;

    task.completedAt = task.completed
        ? new Date().toISOString()
        : null;

    if (!saveTasks()) {
        task.completed = oldCompleted;
        task.completedAt = oldCompletedAt;
        return;
    }

    renderTasks();
    renderCalendar();
}

// ================================
// 17. 页面导航
// ================================

function showPage(page) {
    currentPage = page;

    document.querySelectorAll(".page-section").forEach(section => {
        section.classList.remove("active");
    });

    const pageElement = $(page + "Page");

    if (pageElement) {
        pageElement.classList.add("active");
    }

    document.querySelectorAll(".nav-item").forEach(button => {
        button.classList.remove("active");
    });

    const pageTitles = {
        dashboard: ["学习数据仪表盘", "掌握学习进度，规划每一天。"],
        tasks: ["全部学习任务", "统一管理课程、作业与个人计划。"],
        calendar: ["学习日历", "查看每日任务安排和截止日期。"]
    };

    $("pageTitle").textContent = pageTitles[page][0];
    $("pageSubtitle").textContent = pageTitles[page][1];

    const activeButton = document.querySelector(
        `.nav-item[data-page="${page}"]`
    );

    if (activeButton) {
        activeButton.classList.add("active");
    }

    if (page === "calendar") {
        renderCalendar();
    }
}

document.querySelectorAll(".nav-item[data-page]").forEach(button => {
    button.addEventListener("click", () => {
        showPage(button.dataset.page);
    });
});

document.querySelectorAll(".nav-item[data-filter]").forEach(button => {
    button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;

        showPage("tasks");

        document.querySelectorAll(".nav-item").forEach(item => {
            item.classList.remove("active");
        });

        button.classList.add("active");

        const names = {
            pending: "待完成任务",
            completed: "已完成任务",
            overdue: "已逾期任务"
        };

        $("listTitle").textContent = names[currentFilter];

        renderTasks();
    });
});

$("viewAllTasks").addEventListener("click", () => {
    currentFilter = "all";
    $("listTitle").textContent = "全部学习任务";
    showPage("tasks");
    renderTasks();
});

// ================================
// 18. 搜索与筛选
// ================================

searchInput.addEventListener("input", renderTasks);
categoryFilter.addEventListener("change", renderTasks);
priorityFilter.addEventListener("change", renderTasks);
sortFilter.addEventListener("change", renderTasks);

// ================================
// 19. 学习日历
// ================================

function renderCalendar() {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    $("calendarMonth").textContent =
        `${year}年${month + 1}月`;

    const grid = $("calendarGrid");
    grid.replaceChildren();

    const firstDay = new Date(year, month, 1).getDay();

    const daysInMonth = new Date(
        year,
        month + 1,
        0
    ).getDate();

    const previousMonthDays = new Date(
        year,
        month,
        0
    ).getDate();

    const totalCells = Math.ceil(
        (firstDay + daysInMonth) / 7
    ) * 7;

    for (let i = 0; i < totalCells; i++) {
        let date;
        let isCurrentMonth = true;

        if (i < firstDay) {
            date = new Date(
                year,
                month - 1,
                previousMonthDays - firstDay + i + 1
            );
            isCurrentMonth = false;

        } else if (i >= firstDay + daysInMonth) {
            date = new Date(
                year,
                month + 1,
                i - firstDay - daysInMonth + 1
            );
            isCurrentMonth = false;

        } else {
            date = new Date(
                year,
                month,
                i - firstDay + 1
            );
        }

        const dateString = formatDate(date);

        const dayTasks = tasks.filter(
            task => task.deadline === dateString
        );

        const cell = createElement(
            "button",
            "calendar-day"
        );

        cell.type = "button";

        if (!isCurrentMonth) {
            cell.classList.add("muted-day");
        }

        if (dateString === getToday()) {
            cell.classList.add("today");
        }

        if (dateString === selectedDate) {
            cell.classList.add("selected");
        }

        const number = createElement(
            "span",
            "day-number",
            String(date.getDate())
        );

        const indicators = createElement(
            "span",
            "day-indicator"
        );

        dayTasks.slice(0, 5).forEach(task => {
            const dot = document.createElement("i");

            if (task.completed) {
                dot.classList.add("done");
            } else if (isOverdue(task)) {
                dot.classList.add("late");
            }

            indicators.appendChild(dot);
        });

        cell.append(number, indicators);

        cell.addEventListener("click", () => {
            selectedDate = dateString;
            renderCalendar();
        });

        grid.appendChild(cell);
    }

    renderCalendarTasks();
}

function renderCalendarTasks() {
    $("selectedDateTitle").textContent =
        formatDisplayDate(selectedDate) + " · 当天任务";

    const dayTasks = tasks.filter(
        task => task.deadline === selectedDate
    );

    renderTaskList(
        $("calendarTaskList"),
        dayTasks
    );
}

$("prevMonth").addEventListener("click", () => {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar();
});

$("nextMonth").addEventListener("click", () => {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar();
});

$("todayBtn").addEventListener("click", () => {
    calendarDate = new Date();
    selectedDate = getToday();
    renderCalendar();
});

// ================================
// 20. 深色和浅色主题
// ================================

function applyTheme(theme) {
    const dark = theme === "dark";

    document.body.classList.toggle("dark-theme", dark);

    $("themeSelect").value = dark ? "dark" : "light";

    $("themeToggle").textContent = dark ? "☀" : "◐";

    try {
        localStorage.setItem(THEME_KEY, theme);
    } catch (error) {
        console.warn("主题设置无法保存：", error);
    }
}

function loadTheme() {
    let theme = "light";

    try {
        theme = localStorage.getItem(THEME_KEY) || "light";
    } catch (error) {
        console.warn("主题设置读取失败：", error);
    }

    applyTheme(theme);
}

$("themeToggle").addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("dark-theme")
        ? "light"
        : "dark";

    applyTheme(nextTheme);
});

$("themeSelect").addEventListener("change", event => {
    applyTheme(event.target.value);
});

// ================================
// 21. 系统设置弹窗
// ================================

$("settingsBtn").addEventListener("click", () => {
    settingsModal.classList.add("show");
});

$("closeSettings").addEventListener("click", () => {
    settingsModal.classList.remove("show");
});

// ================================
// 22. 数据导出
// ================================

function exportTasks() {
    const backup = {
        app: "StudyFlow",
        version: "2.0.0",
        exportTime: new Date().toISOString(),
        tasks
    };

    const blob = new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: "application/json;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "StudyFlow学习任务备份.json";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

$("exportBtn").addEventListener("click", exportTasks);

// ================================
// 23. 数据导入
// ================================

$("importBtn").addEventListener("click", () => {
    $("importFile").click();
});

$("importFile").addEventListener("change", async event => {
    const file = event.target.files[0];

    if (!file) return;

    try {
        if (file.size > 1024 * 1024) {
            throw new Error("备份文件不能超过1MB。");
        }

        const text = await file.text();
        const data = JSON.parse(text);

        const sourceTasks = Array.isArray(data)
            ? data
            : data.tasks;

        if (!Array.isArray(sourceTasks)) {
            throw new Error("文件中没有有效的任务列表。");
        }

        if (sourceTasks.length > 1000) {
            throw new Error("任务数量超过1000条。");
        }

        const imported = sourceTasks.map(normalizeTask);

        if (imported.some(task => !task)) {
            throw new Error("文件中包含无效任务，请检查备份文件。");
        }

        const confirmed = confirm(
            `发现${imported.length}条任务。\n导入后将替换当前任务列表，是否继续？`
        );

        if (!confirmed) return;

        const oldTasks = tasks;

        tasks = imported;

        if (!saveTasks()) {
            tasks = oldTasks;
            return;
        }

        renderTasks();
        renderCalendar();

        alert("任务数据恢复成功！");

    } catch (error) {
        alert("导入失败：" + error.message);

    } finally {
        event.target.value = "";
    }
});

// ================================
// 24. 弹窗操作
// ================================

$("addTaskBtn").addEventListener("click", openAddModal);

$("closeModal").addEventListener("click", closeTaskModal);
$("cancelBtn").addEventListener("click", closeTaskModal);

taskModal.addEventListener("click", event => {
    if (event.target === taskModal) {
        closeTaskModal();
    }
});

settingsModal.addEventListener("click", event => {
    if (event.target === settingsModal) {
        settingsModal.classList.remove("show");
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeTaskModal();
        settingsModal.classList.remove("show");
    }
});

// ================================
// 25. 系统初始化
// ================================

function initApp() {
    loadTheme();

    renderTasks();

    renderCalendar();

    console.log("StudyFlow V2.0 初始化成功！");
    console.log("当前任务数量：", tasks.length);
    console.log("数据存储位置：浏览器 localStorage");
}

initApp();
