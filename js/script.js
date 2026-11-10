/* скрипт для работы с книгами */
const bookForm = document.getElementById('addBookForm');
const titleInput = document.getElementById('title');
const authorInput = document.getElementById('author');
const statusSelect = document.getElementById('status');
const booksList = document.getElementById('booksList');
const emptyMessage = document.getElementById('emptyMessage');
const bookCount = document.querySelector('.books_count');
const titleError = document.getElementById('titleError');
const readCount = document.querySelector('.read-count');
const readingCount = document.querySelector('.reading-count');
const wantCount = document.querySelector('.want-count');
const filterOption = document.querySelector('.filter-options');
const noResultsMessage = document.getElementById('noResultsMessage');
const API_URL = 'http://localhost:3000/books';


let books = [];

/* функция для получения списка книг с сервера */
async function fetchBooks() { 
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || `Ошибка при получении данных: ${response.status}`);
        }

        books = await response.json();
        renderBooks();
    } catch (error) {
        console.error('Не удалось загрузить книги:', error.message);
        showServerError(error.message);
    }
}


/* обработчик события отправки формы */
bookForm.addEventListener('submit',async (e) => {
    e.preventDefault();
    let title = titleInput.value.trim();
    let author = authorInput.value.trim();
    let status = statusSelect.value;

    if(!title){
        titleInput.classList.add('input-error');
        titleError.textContent = 'Пожалуйста, введите название книги';
        titleError.style.display = 'block';
        titleInput.focus();
        return;
    }
    
    /* Отправляем POST-запрос на сервер для добавления новой книги */
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                title: title,
                author: author,
                status: status
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || `Ошибка при получении данных: ${response.status}`);
        }

        const createdBook = await response.json();
        books.push(createdBook);
        bookForm.reset();
        renderBooks();
    } catch (error) {
        showServerError(error.message);
        console.error('Не удалось добавить книгу:', error.message);
    }
});

/* обработчик события ввода в поле названия книги */
titleInput.addEventListener('input', () => {
    titleInput.classList.remove('input-error');
    titleError.style.display = 'none';
});


/* функция для отображения списка книг */
function renderBooks(){
    booksList.innerHTML = '';

    const activeCheckboxes = Array.from(document.querySelectorAll('.filter-options input[type="checkbox"]:checked'));
    const selectedStatuses = activeCheckboxes.map(checkbox => checkbox.value);

    let booksToRender = books;
    if (selectedStatuses.length > 0) {
        booksToRender = books.filter(book => selectedStatuses.includes(book.status));
    }

    if(books.length === 0){
        emptyMessage.style.display = 'block';
        noResultsMessage.style.display = 'none';
    }
    else if (booksToRender.length === 0) {
        emptyMessage.style.display = 'none';
        noResultsMessage.style.display = 'block';
    }
    else {
        emptyMessage.style.display = 'none';
        noResultsMessage.style.display = 'none';
    }

    booksToRender.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.classList.add('book_card');
        bookCard.dataset.id = book.id;
        bookCard.dataset.status = book.status;
        bookCard.innerHTML = `
                <div class="book_info">
                    <h3 class="book_title">${escapeHtml(book.title)}</h3>
                    <p class="book_author">Автор: ${escapeHtml(book.author)}</p>
                </div>

                <div class="book-status-control">
                    <label class="statusLabel">Статус:</label>
                    <select class="statusSelect">
                        <option value="read" ${book.status === 'read' ? 'selected' : ''}>Прочитано</option>
                        <option value="reading" ${book.status === 'reading' ? 'selected' : ''}>Читаю</option>
                        <option value="want" ${book.status === 'want' ? 'selected' : ''}>Хочу прочитать</option>
                    </select>
                </div>

                <div class="book-rating-control ${book.status !== 'read' ? 'disabled' : ''}"
                title="${book.status !== 'read' ? 'Оценка доступна только после прочтения книги' : ''}">
                    <div class="rating-stars">
                        <span class="star ${book.rating >= 1 ? 'active' : ''}" data-value="1">&#9733;</span>
                        <span class="star ${book.rating >= 2 ? 'active' : ''}" data-value="2">&#9733;</span>
                        <span class="star ${book.rating >= 3 ? 'active' : ''}" data-value="3">&#9733;</span>
                        <span class="star ${book.rating >= 4 ? 'active' : ''}" data-value="4">&#9733;</span>
                        <span class="star ${book.rating >= 5 ? 'active' : ''}" data-value="5">&#9733;</span>
                    </div>
                    
                    <button type="button" class="clear-rating">Сбросить</button>
                </div>

                <div class="book_actions">
                    <button type="button" class="btn-delete">Удалить</button>
                </div> `;
    booksList.insertAdjacentElement('beforeend', bookCard);
    });
    updateCounters();
}

/* обработчик кнопок */
booksList.addEventListener('click', async (e) => {
    /* обработчик кнопки удаления книги */
    if(e.target.classList.contains('btn-delete')){
        const card = e.target.closest('.book_card');
        const bookId = Number(card.dataset.id);

        const book = books.find(book => book.id === bookId);
        const bookTitle = book ? `"${book.title}"` : 'книгу';

        const isConfirmed = confirm(`Вы уверены, что хотите удалить ${bookTitle}?`);

        if(!isConfirmed) return;

        /* Отправляем DELETE-запрос на сервер для удаления книги */
        try {
            const response = await fetch(`${API_URL}/${bookId}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || `Ошибка при получении данных: ${response.status}`);
        }
            books = books.filter(book => book.id !== bookId);
            renderBooks();
        } catch (error) {
            showServerError(error.message);
            console.error('Ошибка при удалении книги:', error);
        }
    }

    /* обработчик изменения рейтинга */
    if(e.target.classList.contains('star')) {
        const card = e.target.closest('.book_card');
        const bookId = Number(card.dataset.id);
        const starValue = Number(e.target.dataset.value);

        const book = books.find(book => book.id === bookId);

        /* Отправляем PATCH-запрос на сервер для изменения рейтинга книги */
        try {
            const response = await fetch(`${API_URL}/${bookId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating: starValue })
            });
            if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || `Ошибка при получении данных: ${response.status}`);
        }
            const updatedBook = await response.json();
            Object.assign(book, updatedBook);
            renderBooks();
        } catch (error) {
            showServerError(error.message);
            console.error('Ошибка при изменении рейтинга:', error);
        }
    }

    /* обработчик кнопки сброса рейтинга */
    if (e.target.classList.contains('clear-rating')) {
        const card = e.target.closest('.book_card');
        const bookId = Number(card.dataset.id);

        const book = books.find(book => book.id === bookId);

        /* Отправляем PATCH-запрос на сервер для сброса рейтинга книги */
        try {
            const response = await fetch(`${API_URL}/${bookId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating: null })
            });
            if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || `Ошибка при получении данных: ${response.status}`);
        }
            const updatedBook = await response.json();
            Object.assign(book, updatedBook);
            renderBooks();
        }
        catch (error) {
            showServerError(error.message);
            console.error('Ошибка при сбросе рейтинга:', error);
        }
    }
});

/* обработчик изменения статуса книги */
booksList.addEventListener('change', async (e) => {
    if (e.target.classList.contains('statusSelect')) {
        const card = e.target.closest('.book_card');
        const bookId = Number(card.dataset.id);
        const newStatus = e.target.value;

        const book = books.find(book => book.id === bookId);
        if (!book) {
            console.error('Книга не найдена');
            return;
        }

        /* Отправляем PATCH-запрос на сервер для изменения статуса книги */
        try {
            const response = await fetch(`${API_URL}/${bookId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || `Ошибка при получении данных: ${response.status}`);
            }   
            const updatedBook = await response.json();
            Object.assign(book, updatedBook);
            renderBooks();
        } catch (error) {
            console.error('Ошибка при изменении статуса:', error);
            showServerError(error.message);
            e.target.value = book.status; // Возвращаем старое значение в случае ошибки
        }
    }
});

/* функция для обновления счетчиков */
function updateCounters(){
    bookCount.textContent = books.length;
    readCount.textContent = books.filter(book => book.status === 'read').length;
    readingCount.textContent = books.filter(book => book.status === 'reading').length;
    wantCount.textContent = books.filter(book => book.status === 'want').length;
}

/* обработчик изменения фильтров */
filterOption.addEventListener('change', () => {
    renderBooks();
});

/* функция для экранирования HTML */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showServerError(message) {
    if (!message || message === 'Failed to fetch' || message.includes('fetch')) {
        message = 'Не удалось подключиться к серверу. Убедитесь, что сервер запущен.';
    }

    let container = document.querySelector('.server-error-block');
    if (!container) {
        container = document.createElement('div');
        container.className = 'server-error-block';
        document.body.appendChild(container);
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'server-error';
    errorDiv.innerHTML=`
    <span>${escapeHtml(message)}</span>
    <button type="button" class="server-error-close">&times;</button>
    `;
    container.appendChild(errorDiv);

    const removeError = () => {
        errorDiv.classList.add('hiding');
        setTimeout(() => errorDiv.remove(), 300);
    };

    errorDiv.querySelector('.server-error-close').addEventListener('click', removeError);

    setTimeout(removeError, 5000);
}

/* Инициализация приложения: получаем список книг с сервера при загрузке страницы */
fetchBooks();