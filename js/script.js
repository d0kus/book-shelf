/* скрипт для работы с книгами */
const bookForm = document.getElementById('addBookForm');
const titleInput = document.getElementById('title');
const authorInput = document.getElementById('author');
const statusSelect = document.getElementById('status');
const booksList = document.getElementById('booksList');
const emptyMessage = document.getElementById('emptyMessage');
const bookCount = document.querySelector('.books_count');
const titleError = document.getElementById('titleError');

/* массив для хранения книг */
let books = [];

/* обработчик события отправки формы */
bookForm.addEventListener('submit', e =>{
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
    const newBook = {
        id: Date.now(),
        title: title,
        author: author || "Неизвестный автор",
        status: status,
        rating: null
    };
    books.push(newBook);
    bookForm.reset();
    renderBooks();
});

/* обработчик события ввода в поле названия книги */
titleInput.addEventListener('input', () => {
    titleInput.classList.remove('input-error');
    titleError.style.display = 'none';
});


/* функция для отображения списка книг */
function renderBooks(){
    booksList.innerHTML = '';
    if(books.length === 0){
        emptyMessage.style.display = 'block';
    } else {
        emptyMessage.style.display = 'none';
    }

    books.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.classList.add('book_card');
        bookCard.dataset.id = book.id;
        bookCard.dataset.status = book.status;
        bookCard.innerHTML = `
                <div class="book_info">
                    <h3 class="book_title">${book.title}</h3>
                    <p class="book_author">Автор: ${book.author}</p>
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
                        <span class="star" data-value="1">&#9733;</span>
                        <span class="star" data-value="2">&#9733;</span>
                        <span class="star" data-value="3">&#9733;</span>
                        <span class="star" data-value="4">&#9733;</span>
                        <span class="star" data-value="5">&#9733;</span>
                    </div>
                    
                    <button type="button" class="clear-rating">Сбросить</button>
                </div>

                <div class="book_actions">
                    <button type="button" class="btn-delete">Удалить</button>
                </div> `;
    booksList.insertAdjacentElement('beforeend', bookCard);
    });

    bookCount.textContent = books.length;
}

/* обработчик кнопки удаления */
booksList.addEventListener('click', e => {
    if(e.target.classList.contains('btn-delete')){
        const card = e.target.closest('.book_card');
        const bookId = Number(card.dataset.id);
        books = books.filter(book => book.id !== bookId);
        renderBooks();
    }
});


renderBooks();