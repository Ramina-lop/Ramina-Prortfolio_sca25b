/* =========================================================
   script.js — интерактивность портфолио Рамины Зунуновой
   Функции:
   1. Мобильное меню
   2. Фильтрация проектов
   3. Модальное окно проекта
   4. Валидация контактной формы
   + небольшая добавка: раскрытие навыков по клику/тапу
   ========================================================= */

console.log("JavaScript подключён — интерактивность работает!");

'use strict';

/* Ждём, пока вся страница загрузится, затем запускаем функции.
   Каждая функция запускается отдельно в try/catch: если в одной
   что-то сломается, остальные всё равно продолжат работать. */
document.addEventListener('DOMContentLoaded', function () {
  runSafely('Мобильное меню', initMobileMenu);
  runSafely('Фильтр проектов', initProjectFilter);
  runSafely('Модальное окно', initProjectModal);
  runSafely('Форма', initContactForm);
  runSafely('Навыки', initSkillAccordion);
});

/* Вспомогательная функция: запускает функцию и ловит ошибки */
function runSafely(name, fn) {
  try {
    fn();
  } catch (error) {
    console.error('Ошибка в блоке «' + name + '»:', error);
  }
}


/* =========================================================
   1. МОБИЛЬНОЕ МЕНЮ
   Элементы: #nav-toggle (бургер), #nav-list (список ссылок)
   ========================================================= */
function initMobileMenu() {
  var toggle = document.getElementById('nav-toggle');
  var list = document.getElementById('nav-list');

  // Если элементов нет — тихо выходим, чтобы не было ошибок
  if (!toggle || !list) {
    return;
  }

  // Условие «мы на планшете или телефоне» (совпадает с responsive.css)
  var mobileQuery = window.matchMedia('(max-width: 899px)');

  function isOpen() {
    return list.classList.contains('is-open');
  }

  /* aria-hidden: на мобильном закрытое меню скрываем от
     скринридеров, на компьютере меню всегда видимо */
  function syncAriaHidden() {
    if (mobileQuery.matches && !isOpen()) {
      list.setAttribute('aria-hidden', 'true');
    } else {
      list.removeAttribute('aria-hidden');
    }
  }

  // Открыть или закрыть меню
  function setMenu(open) {
    list.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    syncAriaHidden();
  }

  // Клик по бургеру
  toggle.addEventListener('click', function () {
    setMenu(!isOpen());
  });

  // Клик по любой ссылке внутри меню закрывает его
  list.addEventListener('click', function (event) {
    if (event.target.closest('a')) {
      setMenu(false);
    }
  });

  // Клавиша Escape закрывает меню и возвращает фокус на бургер
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && isOpen()) {
      setMenu(false);
      toggle.focus();
    }
  });

  // Если экран стал широким (например, поворот планшета) — сбрасываем меню
  function onBreakpointChange() {
    setMenu(false);
  }

  if (mobileQuery.addEventListener) {
    mobileQuery.addEventListener('change', onBreakpointChange);
  } else if (mobileQuery.addListener) {
    mobileQuery.addListener(onBreakpointChange); // старые браузеры
  }

  // Начальное состояние
  setMenu(false);
}


/* =========================================================
   2. ФИЛЬТРАЦИЯ ПРОЕКТОВ
   Кнопки: .filter[data-filter]
   Карточки: .project-card[data-category]
   ========================================================= */
function initProjectFilter() {
  var filterButtons = document.querySelectorAll('.filter');
  var cards = document.querySelectorAll('.project-card');

  if (filterButtons.length === 0 || cards.length === 0) {
    return;
  }

  // Показывает только карточки выбранной категории
  function applyFilter(category) {
    cards.forEach(function (card) {
      var matches = category === 'all' || card.dataset.category === category;
      card.classList.toggle('is-hidden', !matches);
      card.setAttribute('aria-hidden', String(!matches));
    });
  }

  filterButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      var category = button.dataset.filter || 'all';

      // Подсвечиваем только нажатую кнопку
      filterButtons.forEach(function (other) {
        var isActive = other === button;
        other.classList.toggle('is-active', isActive);
        other.setAttribute('aria-pressed', String(isActive));
      });

      applyFilter(category);
    });
  });
}


/* =========================================================
   3. МОДАЛЬНОЕ ОКНО ПРОЕКТА
   Окно: <dialog id="project-modal">
   Данные проектов: <template id="project-data">
   Кнопки открытия: [data-modal-open="id-проекта"]
   ========================================================= */
function initProjectModal() {
  var modal = document.getElementById('project-modal');
  var dataTemplate = document.getElementById('project-data');
  var closeButton = document.getElementById('modal-close');
  var prevButton = document.getElementById('modal-prev');
  var nextButton = document.getElementById('modal-next');

  var mediaBox = document.getElementById('modal-media');
  var metaBox = document.getElementById('modal-meta');
  var titleBox = document.getElementById('modal-title');
  var textBox = document.getElementById('modal-text');
  var roleBox = document.getElementById('modal-role');
  var tagsBox = document.getElementById('modal-tags');

  if (!modal || !dataTemplate || !dataTemplate.content || !mediaBox || !metaBox ||
      !titleBox || !textBox || !roleBox || !tagsBox) {
    return;
  }

  var currentId = '';       // какой проект открыт сейчас
  var lastOpener = null;    // кнопка, которой открыли окно (для возврата фокуса)
  var supportsDialog = typeof modal.showModal === 'function';

  // Находит данные проекта по id внутри <template>
  function getProjectData(id) {
    return dataTemplate.content.querySelector('[id="' + id + '"]');
  }

  // Список id только видимых (не отфильтрованных) проектов — для Prev/Next
  function getVisibleIds() {
    var buttons = document.querySelectorAll('.project-card:not(.is-hidden) [data-modal-open]');
    return Array.prototype.map.call(buttons, function (button) {
      return button.dataset.modalOpen;
    });
  }

  // Заполняет окно данными выбранного проекта
  function fillModal(id) {
    var source = getProjectData(id);
    if (!source) {
      return false;
    }

    currentId = id;
    metaBox.textContent = source.dataset.meta || '';
    titleBox.textContent = source.dataset.title || '';
    textBox.textContent = source.dataset.text || '';
    roleBox.textContent = source.dataset.role || '';

    // Картинка или заглушка с названием проекта
    mediaBox.textContent = '';
    if (source.dataset.image) {
      var image = document.createElement('img');
      image.src = source.dataset.image;
      image.alt = source.dataset.title || '';
      mediaBox.appendChild(image);
    } else {
      var placeholder = document.createElement('span');
      placeholder.className = 'project-card__placeholder';
      placeholder.textContent = source.dataset.title || '';
      mediaBox.appendChild(placeholder);
    }

    // Теги: строка «A,B,C» превращается в список <li>
    tagsBox.textContent = '';
    (source.dataset.tags || '').split(',').forEach(function (tagText) {
      var cleaned = tagText.trim();
      if (cleaned) {
        var tag = document.createElement('li');
        tag.className = 'tag';
        tag.textContent = cleaned;
        tagsBox.appendChild(tag);
      }
    });

    // Если видимый проект один, листать некуда
    var onlyOne = getVisibleIds().length < 2;
    if (prevButton) { prevButton.disabled = onlyOne; }
    if (nextButton) { nextButton.disabled = onlyOne; }

    modal.scrollTop = 0;
    return true;
  }

  function openModal(id, opener) {
    if (!fillModal(id)) {
      return;
    }
    lastOpener = opener || null;

    if (!modal.open) {
      if (supportsDialog) {
        modal.showModal();
      } else {
        modal.setAttribute('open', ''); // запасной вариант для старых браузеров
      }
    }
  }

  function closeModal() {
    if (!modal.open) {
      return;
    }
    if (typeof modal.close === 'function') {
      modal.close();
    } else {
      modal.removeAttribute('open');
      returnFocus();
    }
  }

  // После закрытия возвращаем фокус на кнопку, которой открыли окно
  function returnFocus() {
    if (lastOpener && typeof lastOpener.focus === 'function') {
      lastOpener.focus();
    }
  }

  // Переключение на предыдущий (-1) или следующий (+1) проект
  function step(direction) {
    var ids = getVisibleIds();
    if (ids.length < 2) {
      return;
    }
    var index = ids.indexOf(currentId);
    var nextIndex = (index + direction + ids.length) % ids.length;
    fillModal(ids[nextIndex]);
  }

  // Клик по кнопке «Read more» (один обработчик на весь документ)
  document.addEventListener('click', function (event) {
    var opener = event.target.closest('[data-modal-open]');
    if (opener) {
      openModal(opener.dataset.modalOpen, opener);
    }
  });

  // Закрытие: кнопка ✕
  if (closeButton) {
    closeButton.addEventListener('click', closeModal);
  }

  // Закрытие: клик вне окна (по тёмному фону — это клик по самому <dialog>)
  modal.addEventListener('click', function (event) {
    if (event.target === modal) {
      closeModal();
    }
  });

  // Закрытие: Escape. Обычно <dialog> делает это сам,
  // но для старых браузеров добавляем запасной вариант.
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !supportsDialog && modal.open) {
      closeModal();
    }
  });

  // Событие «close» срабатывает при любом закрытии окна
  modal.addEventListener('close', returnFocus);

  // Кнопки Prev / Next
  if (prevButton) {
    prevButton.addEventListener('click', function () { step(-1); });
  }
  if (nextButton) {
    nextButton.addEventListener('click', function () { step(1); });
  }
}


/* =========================================================
   4. ВАЛИДАЦИЯ КОНТАКТНОЙ ФОРМЫ
   Форма: #contact-form
   Поля: #contact-name, #contact-email, #contact-message
   Ошибки: #error-name, #error-email, #error-message
   Успех: #form-success
   ========================================================= */
function initContactForm() {
  var form = document.getElementById('contact-form');
  var successBox = document.getElementById('form-success');

  if (!form || !successBox) {
    return;
  }

  // Описание полей: где поле, где его ошибка и как его проверять
  var fields = [
    {
      input: document.getElementById('contact-name'),
      error: document.getElementById('error-name'),
      validate: function (value) {
        if (value === '') { return 'Введите ваше имя.'; }
        if (value.length < 2) { return 'Имя должно содержать минимум 2 символа.'; }
        return '';
      }
    },
    {
      input: document.getElementById('contact-email'),
      error: document.getElementById('error-email'),
      validate: function (value) {
        if (value === '') { return 'Введите адрес электронной почты.'; }
        // простая проверка: что-то@что-то.домен
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
          return 'Проверьте email: он должен выглядеть как name@example.com.';
        }
        return '';
      }
    },
    {
      input: document.getElementById('contact-message'),
      error: document.getElementById('error-message'),
      validate: function (value) {
        if (value === '') { return 'Напишите сообщение.'; }
        if (value.length < 10) { return 'Сообщение слишком короткое: напишите минимум 10 символов.'; }
        return '';
      }
    }
  ];

  // Оставляем только те поля, которые реально нашлись на странице
  fields = fields.filter(function (field) {
    return field.input && field.error;
  });

  if (fields.length === 0) {
    return;
  }

  // Показывает или убирает ошибку возле поля
  function showError(field, message) {
    field.error.textContent = message;
    field.input.classList.toggle('is-invalid', message !== '');
    field.input.setAttribute('aria-invalid', message !== '' ? 'true' : 'false');
  }

  // Проверяет одно поле. Возвращает true, если всё верно.
  function checkField(field) {
    var message = field.validate(field.input.value.trim());
    showError(field, message);
    return message === '';
  }

  // Связываем поле с текстом ошибки для скринридеров
  fields.forEach(function (field) {
    field.input.setAttribute('aria-describedby', field.error.id);

    // Когда пользователь ушёл из поля — проверяем его
    field.input.addEventListener('blur', function () {
      if (field.input.value.trim() !== '' || field.error.textContent !== '') {
        checkField(field);
      }
    });

    // Пока печатает — убираем ошибку, как только поле стало верным,
    // и прячем старое сообщение об успехе
    field.input.addEventListener('input', function () {
      successBox.textContent = '';
      if (field.error.textContent !== '') {
        checkField(field);
      }
    });
  });

  // Отправка формы: сервера нет, поэтому только проверяем данные
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    successBox.textContent = '';

    var firstInvalid = null;
    var userName = '';

    fields.forEach(function (field) {
      var isValid = checkField(field);
      if (!isValid && !firstInvalid) {
        firstInvalid = field.input;
      }
    });

    // Есть ошибки — ставим курсор в первое неверное поле
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    // Всё верно: показываем сообщение об успехе и очищаем форму
    userName = fields[0].input.value.trim();
    successBox.textContent = 'Спасибо, ' + userName + '! Все поля заполнены верно. ' +
      'Сообщение пока никуда не отправляется: сервер ещё не подключён.';

    form.reset();
    fields.forEach(function (field) {
      showError(field, '');
    });
  });
}


/* =========================================================
   ДОБАВКА: РАСКРЫТИЕ НАВЫКОВ
   Кнопки .skill-item__button уже есть в HTML, но без JS они
   не реагируют на тап. Скрипт меняет aria-expanded, а CSS
   показывает или прячет плашку с описанием.
   ========================================================= */
function initSkillAccordion() {
  var skillButtons = document.querySelectorAll('.skill-item__button');

  skillButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      var isExpanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!isExpanded));
    });
  });
}


// Плавающая кнопка Back to Top
const backToTop = document.querySelector("#backToTop");

if (backToTop) {
  window.addEventListener("scroll", () => {
    if (window.scrollY > 400) {
      backToTop.classList.add("visible");
    } else {
      backToTop.classList.remove("visible");
    }
  });
}
