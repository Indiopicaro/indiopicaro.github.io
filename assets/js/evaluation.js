document.addEventListener('DOMContentLoaded', function() {
  const markdownInput = document.getElementById('markdownInput');
  const processBtn = document.getElementById('processBtn');
  const clearBtn = document.getElementById('clearBtn');
  const resultsSection = document.getElementById('resultsSection');
  const evaluationResults = document.getElementById('evaluationResults');
  const totalQuestions = document.getElementById('totalQuestions');
  const correctAnswers = document.getElementById('correctAnswers');
  const score = document.getElementById('score');

  if (!markdownInput || !processBtn || !clearBtn || !resultsSection || !evaluationResults) {
    console.error('Elementos necesarios no encontrados');
    return;
  }

  processBtn.addEventListener('click', function() {
    const markdown = markdownInput.value.trim();
    if (!markdown) {
      alert('Por favor, pega un cuestionario en el área de texto.');
      return;
    }

    try {
      const evaluation = processMarkdownQuiz(markdown);
      if (evaluation.questions.length === 0) {
        alert('No se encontraron preguntas válidas en el formato especificado.');
        return;
      }
      displayQuiz(evaluation.questions);
      resultsSection.style.display = 'block';
    } catch (error) {
      alert('Error al procesar el cuestionario: ' + error.message);
    }
  });

  clearBtn.addEventListener('click', function() {
    markdownInput.value = '';
    resultsSection.style.display = 'none';
    evaluationResults.innerHTML = '';
  });

  function processMarkdownQuiz(markdown) {
    const lines = markdown.split('\n');
    const questions = [];
    let currentQuestion = null;
    let questionNumber = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detectar preguntas (líneas que empiezan con número y punto)
      if (/^\d+\./.test(line)) {
        if (currentQuestion) {
          questions.push(currentQuestion);
        }
        currentQuestion = {
          number: questionNumber++,
          text: line.replace(/^\d+\.\s*/, ''),
          answers: [],
          correctAnswer: null,
          userAnswer: null,
          explanation: null
        };
      }
      // Detectar respuestas (líneas que empiezan con letras)
      else if (currentQuestion && /^[a-d]\)/.test(line.toLowerCase())) {
        const answerLetter = line.match(/^([a-d])/i)[1].toLowerCase();
        const answerText = line.replace(/^[a-d]\)\s*/, '');
        const isCorrect = line.includes('*') || line.includes('(correcta)') || line.includes('(correcto)');
        
        currentQuestion.answers.push({
          letter: answerLetter,
          text: answerText.replace(/[\*\(\)]/g, '').trim(),
          isCorrect: isCorrect
        });

        if (isCorrect) {
          currentQuestion.correctAnswer = answerLetter;
        }
      }
      // Detectar explicaciones (líneas que empiezan con "Explicación:" o "Explicacion:")
      else if (currentQuestion && /^explicaci[oó]n:?\s*/i.test(line)) {
        currentQuestion.explanation = line.replace(/^explicaci[oó]n:?\s*/i, '').trim();
      }
    }

    if (currentQuestion) {
      questions.push(currentQuestion);
    }

    return {
      questions: questions,
      total: questions.length,
      correct: 0,
      score: 0
    };
  }

  function displayQuiz(questions) {
    let html = '<form id="quizForm">';
    
    questions.forEach((question, index) => {
      html += '<div class="question-item">';
      html += '<div class="question-text">' + question.number + '. ' + question.text + '</div>';
      html += '<div class="answers">';
      
      question.answers.forEach(answer => {
        html += '<label class="answer-option">';
        html += '<input type="radio" name="q' + index + '" value="' + answer.letter + '" required>';
        html += '<span class="answer-text">' + answer.letter + ') ' + answer.text + '</span>';
        html += '</label>';
      });
      
      html += '</div>';
      html += '</div>';
    });
    
    html += '<button type="submit" class="btn btn-success">Evaluar Respuestas</button>';
    html += '</form>';
    
    evaluationResults.innerHTML = html;
    
    // Agregar event listener para el formulario
    const form = document.getElementById('quizForm');
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        evaluateAnswers(questions);
      });
    }
  }

  function evaluateAnswers(questions) {
    const form = document.getElementById('quizForm');
    if (!form) return;
    
    const formData = new FormData(form);
    let correctCount = 0;

    // Recopilar respuestas del usuario
    questions.forEach((question, index) => {
      const userAnswer = formData.get('q' + index);
      question.userAnswer = userAnswer;
      
      if (userAnswer === question.correctAnswer) {
        correctCount++;
      }
    });

    // Mostrar resultados
    displayResults({
      questions: questions,
      total: questions.length,
      correct: correctCount,
      score: Math.round((correctCount / questions.length) * 100)
    });
  }

  function displayResults(evaluation) {
    let html = '<h4>Resultados de tu evaluación:</h4>';
    let correctCount = 0;

    evaluation.questions.forEach(question => {
      const isCorrect = question.userAnswer === question.correctAnswer;
      if (isCorrect) correctCount++;

      html += '<div class="question-item ' + (isCorrect ? 'correct' : 'incorrect') + '">';
      html += '<div class="question-text">' + question.number + '. ' + question.text + '</div>';
      html += '<div class="answers">';

      question.answers.forEach(answer => {
        let answerClass = '';
        let indicators = '';
        
        if (answer.letter === question.correctAnswer) {
          answerClass = 'correct';
          indicators += ' ✓ Correcta';
        }
        if (answer.letter === question.userAnswer) {
          answerClass = answer.letter === question.correctAnswer ? 'correct' : 'incorrect';
          indicators += answer.letter === question.correctAnswer ? '' : ' ✗ Tu respuesta';
        }
        
        html += '<div class="answer-text ' + answerClass + '">';
        html += answer.letter + ') ' + answer.text;
        html += '<span class="indicators">' + indicators + '</span>';
        html += '</div>';
      });

      html += '</div>';
      html += '<div class="feedback ' + (isCorrect ? 'correct' : 'incorrect') + '">';
      
      if (isCorrect) {
        html += '¡Correcto!';
        if (question.explanation) {
          html += '<br><strong>Explicación:</strong> ' + question.explanation;
        }
      } else {
        html += 'Tu respuesta: ' + (question.userAnswer || 'No respondida') + ' | Respuesta correcta: ' + question.correctAnswer;
        if (question.explanation) {
          html += '<br><strong>Explicación:</strong> ' + question.explanation;
        }
      }
      
      html += '</div>';
      html += '</div>';
    });

    evaluationResults.innerHTML = html;
    totalQuestions.textContent = evaluation.total;
    correctAnswers.textContent = correctCount;
    score.textContent = evaluation.score + '%';
  }

  // Ejemplo de cuestionario para mostrar el formato esperado
  const exampleQuiz = `1. ¿Cuál es el protocolo más común para transferencia segura de archivos?

a) FTP
b) SFTP *
c) HTTP
d) SMTP

Explicación: SFTP (SSH File Transfer Protocol) es el protocolo más seguro para transferir archivos ya que utiliza SSH para cifrar toda la comunicación, incluyendo autenticación y datos.

2. ¿Qué herramienta se utiliza para escanear puertos?

a) Wireshark
b) Nmap *
c) Metasploit
d) Burp Suite

Explicación: Nmap (Network Mapper) es la herramienta estándar de la industria para el descubrimiento de hosts y escaneo de puertos en redes. Permite detectar qué servicios están ejecutándose en qué puertos.

3. ¿Cuál es el puerto por defecto para HTTPS?

a) 80
b) 443 *
c) 8080
d) 8443

Explicación: El puerto 443 es el puerto estándar asignado por la IANA para el protocolo HTTPS (HTTP sobre SSL/TLS). El puerto 80 es para HTTP sin cifrar.`;

  markdownInput.placeholder = exampleQuiz;
});
