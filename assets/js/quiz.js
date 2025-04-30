function initQuiz(quizData) {
    console.log('Inicializando quiz con datos:', quizData);
    
    const modal = document.getElementById('quiz-modal');
    const openBtn = document.querySelector('.open-quiz-btn');
    const closeBtn = document.querySelector('.close-modal');
    const quizTitle = document.getElementById('quiz-title');
    const quizQuestions = document.getElementById('quiz-questions');

    if (!modal || !openBtn || !closeBtn || !quizTitle || !quizQuestions) {
        console.error('No se encontraron elementos necesarios del quiz');
        return;
    }

    function openModal() {
        console.log('Abriendo modal');
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        console.log('Cerrando modal');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });

    try {
        if (!quizData || !quizData.questions || !Array.isArray(quizData.questions)) {
            throw new Error('Formato de datos inválido');
        }

        quizTitle.textContent = quizData.title || 'Cuestionario';
        
        quizData.questions.forEach((question, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'quiz-question';
            questionDiv.dataset.correctAnswer = question.correct_answer;
            questionDiv.dataset.explanation = question.explanation;
            
            questionDiv.innerHTML = `
                <p class="question-text">${question.question}</p>
                <div class="options">
                    ${question.options.map((option, optionIndex) => `
                        <div class="option">
                            <input type="radio" 
                                   name="question_${index}" 
                                   id="q${index}_${optionIndex}"
                                   value="${optionIndex}">
                            <label for="q${index}_${optionIndex}">${option}</label>
                        </div>
                    `).join('')}
                </div>
                <div class="feedback hidden"></div>
            `;
            
            quizQuestions.appendChild(questionDiv);
        });

        document.querySelector('.check-answers').addEventListener('click', function() {
            console.log('Verificando respuestas');
            const questions = document.querySelectorAll('.quiz-question');
            
            questions.forEach((question) => {
                const selectedOption = question.querySelector('input[type="radio"]:checked');
                const feedback = question.querySelector('.feedback');
                const correctAnswer = parseInt(question.dataset.correctAnswer);
                
                if (selectedOption) {
                    const isCorrect = parseInt(selectedOption.value) === correctAnswer;
                    feedback.classList.remove('hidden');
                    feedback.className = `feedback ${isCorrect ? 'correct' : 'incorrect'}`;
                    feedback.textContent = isCorrect ? 
                        '¡Correcto! ' + question.dataset.explanation :
                        'Incorrecto. Intenta de nuevo.';
                } else {
                    feedback.classList.remove('hidden');
                    feedback.className = 'feedback incorrect';
                    feedback.textContent = 'Por favor, selecciona una respuesta.';
                }
            });
        });

    } catch (error) {
        console.error('Error al inicializar el quiz:', error);
        quizTitle.textContent = 'Error al cargar el cuestionario';
        quizQuestions.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}
