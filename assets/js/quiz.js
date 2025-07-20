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
        quizQuestions.innerHTML = ''; // Limpiar contenedor
        
        // Crear el contenedor para el resultado
        const resultContainer = document.createElement('div');
        resultContainer.className = 'quiz-result hidden';
        resultContainer.innerHTML = `
            <div class="result-message"></div>
            <div class="progress-bar">
                <div class="progress-fill"></div>
                <div class="progress-text"></div>
            </div>
        `;
        quizQuestions.parentNode.insertBefore(resultContainer, document.querySelector('.check-answers'));
        
        // Agregar estilos para la barra de progreso
        const style = document.createElement('style');
        style.textContent = `
            .quiz-result {
                margin: 20px 0;
                text-align: center;
            }
            .quiz-result.hidden {
                display: none;
            }
            .result-message {
                font-size: 1.2rem;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .progress-bar {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                height: 20px;
                position: relative;
                margin: 10px 0;
                overflow: hidden;
            }
            .progress-fill {
                background: #4CAF50;
                height: 100%;
                width: 0;
                transition: width 0.5s ease;
                border-radius: 10px;
            }
            .progress-fill.partial {
                background: #ff9800;
            }
            .progress-text {
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                color: white;
                font-weight: bold;
            }
        `;
        document.head.appendChild(style);
        
        quizData.questions.forEach((question, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'quiz-question';
            questionDiv.dataset.correctAnswer = question.correct_answer;
            questionDiv.dataset.explanation = question.explanation;
            
            // Procesar la pregunta y las opciones con marked
            const processedQuestion = marked.parse(question.question);
            const processedOptions = question.options.map(option => marked.parse(option));
            
            questionDiv.innerHTML = `
                <div class="question-text">${processedQuestion}</div>
                <div class="options">
                    ${processedOptions.map((option, optionIndex) => `
                        <div class="option-card">
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
            let correctAnswers = 0;
            const totalQuestions = questions.length;
            
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
                    if (isCorrect) {
                        correctAnswers++;
                    }
                } else {
                    feedback.classList.remove('hidden');
                    feedback.className = 'feedback incorrect';
                    feedback.textContent = 'Por favor, selecciona una respuesta.';
                }
            });

            // Actualizar la barra de progreso
            const resultContainer = document.querySelector('.quiz-result');
            const progressFill = resultContainer.querySelector('.progress-fill');
            const progressText = resultContainer.querySelector('.progress-text');
            const resultMessage = resultContainer.querySelector('.result-message');
            
            resultContainer.classList.remove('hidden');
            const percentage = (correctAnswers / totalQuestions) * 100;
            progressFill.style.width = `${percentage}%`;
            progressFill.className = `progress-fill ${correctAnswers === totalQuestions ? '' : 'partial'}`;
            progressText.textContent = `${correctAnswers}/${totalQuestions}`;
            
            if (correctAnswers === totalQuestions) {
                resultMessage.textContent = '¡Felicitaciones!';
                resultMessage.style.color = '#4CAF50';
                triggerConfetti();
            } else {
                resultMessage.textContent = '¡Sigue intentando!';
                resultMessage.style.color = '#ff9800';
            }
        });

    } catch (error) {
        console.error('Error al inicializar el quiz:', error);
        quizTitle.textContent = 'Error al cargar el cuestionario';
        quizQuestions.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

function triggerConfetti() {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, {
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        }));
        confetti(Object.assign({}, defaults, {
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        }));
    }, 250);
}
