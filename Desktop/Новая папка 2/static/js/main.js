// Тема
if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
}

document.getElementById("themeToggle")?.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
});

// Скролл
window.addEventListener("scroll", () => {
    const scrollBtn = document.getElementById("scrollTopBtn");
    if (scrollBtn) {
        scrollBtn.style.display = window.scrollY > 300 ? "block" : "none";
    }
    
    document.querySelectorAll(".fade-scroll").forEach(el => {
        if (el.getBoundingClientRect().top < window.innerHeight - 100) {
            el.classList.add("visible");
        }
    });
});

document.getElementById("scrollTopBtn")?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
});

// Таймер
function updateCountdown() {
    const target = new Date(2026, 3, 15, 19, 0, 0);
    const now = new Date();
    const diff = target - now;
    const countdownEl = document.getElementById("countdown");
    
    if (countdownEl) {
        if (diff <= 0) {
            countdownEl.innerHTML = "Премьера уже началась! 🎭";
        } else {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diff % (1000 * 60)) / 1000);
            countdownEl.innerHTML = `${days}д ${hours}ч ${mins}м ${secs}с`;
        }
    }
}

setInterval(updateCountdown, 1000);
updateCountdown();

// Загрузка спектаклей через API
let currentPerformanceId = null;
let currentPerformancePrice = 0;

async function loadPerformances() {
    const container = document.getElementById("performancesContainer");
    if (!container) return;
    
    container.innerHTML = '<div class="loading">�� Загрузка спектаклей...</div>';
    
    try {
        const response = await fetch("/api/performances");
        if (!response.ok) throw new Error("Ошибка загрузки");
        const performances = await response.json();
        renderPerformances(performances);
    } catch (error) {
        console.error("Ошибка загрузки:", error);
        container.innerHTML = '<div class="loading">❌ Ошибка загрузки спектаклей. Попробуйте позже.</div>';
    }
}

function renderPerformances(performances) {
    const container = document.getElementById("performancesContainer");
    
    if (!performances || performances.length === 0) {
        container.innerHTML = '<div class="loading">😔 Спектакли не найдены</div>';
        return;
    }
    
    container.innerHTML = performances.map(perf => `
        <div class="card" data-category="${perf.category}" data-name="${perf.name}">
            <div class="card-inner">
                <img src="/static/images/${perf.image_url}" 
                     onerror="this.src='https://placehold.co/280x200/831717/fbc603?text=${encodeURIComponent(perf.name)}'">
                <div class="card-content">
                    <h4>${perf.name}</h4>
                    <p><i class="fas fa-calendar"></i> ${perf.date} ${perf.time}</p>
                    <p><i class="fas fa-tag"></i> ${perf.price} ₽</p>
                    <p><i class="fas fa-chair"></i> Свободно мест: ${perf.available_seats}</p>
                    <button class="btn-small book-btn" data-id="${perf.id}">
                        <i class="fas fa-ticket-alt"></i> Забронировать
                    </button>
                </div>
            </div>
        </div>
    `).join("");
    
    // Добавляем обработчики для кнопок бронирования
    document.querySelectorAll(".book-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = parseInt(btn.dataset.id);
            
            // Проверяем, авторизован ли пользователь
            const isLoggedIn = document.querySelector('a[href="/logout"]') !== null;
            
            if (!isLoggedIn) {
                // Если не авторизован, показываем сообщение и перенаправляем на вход
                const confirmLogin = confirm("Для бронирования билетов необходимо войти в аккаунт. Перейти на страницу входа?");
                if (confirmLogin) {
                    window.location.href = "/login";
                }
                return;
            }
            
            // Если авторизован, открываем окно бронирования
            await openBookingModal(id);
        });
    });
}

// Фильтрация спектаклей
async function filterPerformances() {
    const activeFilter = document.querySelector(".filter-btn.active")?.dataset.filter || "all";
    const searchTerm = document.getElementById("searchInput")?.value || "";
    
    try {
        const response = await fetch(`/api/performances?category=${activeFilter}&search=${encodeURIComponent(searchTerm)}`);
        const performances = await response.json();
        renderPerformances(performances);
    } catch (error) {
        console.error("Ошибка фильтрации:", error);
    }
}

// Обработчики фильтров
document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        filterPerformances();
    });
});

// Поиск
const searchInput = document.getElementById("searchInput");
if (searchInput) {
    searchInput.addEventListener("input", () => {
        filterPerformances();
    });
}

// Модальное окно бронирования
const modal = document.getElementById("bookingModal");

async function openBookingModal(performanceId) {
    currentPerformanceId = performanceId;
    
    try {
        const response = await fetch(`/api/performances/${performanceId}`);
        if (!response.ok) throw new Error("Не удалось загрузить спектакль");
        const performance = await response.json();
        currentPerformancePrice = performance.price;
        
        const ticketsCount = document.getElementById("ticketsCount");
        if (ticketsCount) {
            ticketsCount.max = performance.available_seats;
            ticketsCount.value = 1;
            updateTotalPrice();
        }
        
        if (modal) modal.style.display = "flex";
    } catch (error) {
        console.error("Ошибка:", error);
        alert("❌ Не удалось загрузить информацию о спектакле");
    }
}

function updateTotalPrice() {
    const count = parseInt(document.getElementById("ticketsCount")?.value) || 1;
    const totalSpan = document.getElementById("totalPrice");
    if (totalSpan) {
        totalSpan.textContent = count * currentPerformancePrice;
    }
}

// Обработчик изменения количества билетов
const ticketsCountInput = document.getElementById("ticketsCount");
if (ticketsCountInput) {
    ticketsCountInput.addEventListener("input", updateTotalPrice);
}

// Подтверждение бронирования
const confirmBtn = document.getElementById("confirmBooking");
if (confirmBtn) {
    confirmBtn.addEventListener("click", async () => {
        const ticketsCount = parseInt(document.getElementById("ticketsCount").value);
        
        // Дополнительная проверка на сервере
        if (ticketsCount < 1 || ticketsCount > 10) {
            alert("❌ Некорректное количество билетов (от 1 до 10)");
            return;
        }
        
        try {
            const response = await fetch("/api/bookings", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    performance_id: currentPerformanceId,
                    tickets_count: ticketsCount
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                alert(result.message);
                if (modal) modal.style.display = "none";
                filterPerformances(); // Обновляем список спектаклей
                
                // Если на странице профиля, обновляем список бронирований
                if (typeof loadUserBookings === "function") {
                    loadUserBookings();
                }
            } else {
                alert(`❌ ${result.error || "Ошибка бронирования"}`);
            }
        } catch (error) {
            console.error("Ошибка:", error);
            alert("❌ Произошла ошибка при бронировании. Попробуйте позже.");
        }
    });
}

// Закрытие модального окна
document.querySelectorAll(".close").forEach(btn => {
    btn.addEventListener("click", () => {
        if (modal) modal.style.display = "none";
    });
});

window.addEventListener("click", (e) => {
    if (e.target === modal) {
        modal.style.display = "none";
    }
});

// Отмена бронирования (для страницы профиля)
window.cancelBooking = async function(bookingId) {
    if (confirm("Вы уверены, что хотите отменить бронирование?")) {
        try {
            const response = await fetch(`/api/bookings/${bookingId}`, {
                method: "DELETE"
            });
            
            const result = await response.json();
            
            if (response.ok) {
                alert(result.message);
                location.reload(); // Перезагружаем страницу для обновления списка
            } else {
                alert(`❌ ${result.error || "Ошибка отмены бронирования"}`);
            }
        } catch (error) {
            console.error("Ошибка:", error);
            alert("❌ Произошла ошибка при отмене бронирования");
        }
    }
};

// Загрузка бронирований для страницы профиля (если нужно)
async function loadUserBookings() {
    const container = document.getElementById("bookingsList");
    if (!container) return;
    
    try {
        const response = await fetch("/api/bookings");
        if (!response.ok) throw new Error("Ошибка загрузки");
        const bookings = await response.json();
        
        if (bookings.length === 0) {
            container.innerHTML = '<p>У вас пока нет бронирований</p>';
        } else {
            // Обновляем список, если нужно динамическое обновление
            // (сейчас используется серверный рендеринг)
        }
    } catch (error) {
        console.error("Ошибка:", error);
    }
}

// Инициализация
if (document.getElementById("performancesContainer")) {
    loadPerformances();
}

// Анимация при загрузке
setTimeout(() => {
    document.querySelectorAll(".fade-scroll").forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight - 100) {
            el.classList.add("visible");
        }
    });
}, 100);

// Маска для телефона (если есть поле ввода телефона)
const phoneInput = document.getElementById("phone");
if (phoneInput) {
    phoneInput.addEventListener("input", function(e) {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 11) val = val.slice(0, 11);
        let formatted = '';
        if (val.length > 0) formatted = '+7';
        if (val.length > 1) formatted += ' (' + val.slice(1, 4);
        if (val.length >= 5) formatted += ') ' + val.slice(4, 7);
        if (val.length >= 8) formatted += '-' + val.slice(7, 9);
        if (val.length >= 10) formatted += '-' + val.slice(9, 11);
        e.target.value = formatted;
    });
}

// Booking system main logic
