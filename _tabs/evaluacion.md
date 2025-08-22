---
# the default layout is 'page'
icon: fas fa-clipboard-check
order: 5
---

# Evaluación de Cuestionarios

Esta herramienta te permite evaluar cuestionarios en formato Markdown de manera temporal. Simplemente pega tu cuestionario en el área de texto y haz clic en "Procesar" para obtener una evaluación instantánea.

<div class="evaluation-container">
  <div class="input-section">
    <h3>Pega tu cuestionario aquí:</h3>
    <textarea id="markdownInput" placeholder="Pega tu cuestionario en formato Markdown aquí..."></textarea>
    <button id="processBtn" class="btn btn-primary">Procesar Cuestionario</button>
    <button id="clearBtn" class="btn btn-secondary">Limpiar</button>
  </div>
  
  <div class="results-section" id="resultsSection" style="display: none;">
    <h3>Resultados de la Evaluación:</h3>
    <div id="evaluationResults"></div>
    <div class="stats">
      <div class="stat-item">
        <span class="stat-label">Total de preguntas:</span>
        <span id="totalQuestions" class="stat-value">0</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Preguntas correctas:</span>
        <span id="correctAnswers" class="stat-value">0</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Puntuación:</span>
        <span id="score" class="stat-value">0%</span>
      </div>
    </div>
  </div>
</div>

<style>
.evaluation-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.input-section {
  margin-bottom: 30px;
}

#markdownInput {
  width: 100%;
  min-height: 300px;
  padding: 15px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  resize: vertical;
  margin-bottom: 15px;
}

#markdownInput:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s ease;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

  .btn-primary:hover {
    background-color: #0056b3;
  }

  .btn-secondary {
    background-color: #6c757d;
    color: white;
    margin-left: 10px;
  }

  .btn-secondary:hover {
    background-color: #545b62;
  }

.results-section {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.stats {
  display: flex;
  justify-content: space-around;
  margin-top: 20px;
  padding: 15px;
  background-color: white;
  border-radius: 5px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-weight: bold;
  color: #6c757d;
  margin-bottom: 5px;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: bold;
  color: #007bff;
}

.question-item {
  background-color: white;
  padding: 15px;
  margin: 10px 0;
  border-radius: 5px;
  border-left: 4px solid #007bff;
}

.question-item.correct {
  border-left-color: #28a745;
}

.question-item.incorrect {
  border-left-color: #dc3545;
}

.question-text {
  font-weight: bold;
  margin-bottom: 10px;
}

.answer-text {
  margin: 5px 0;
  padding: 5px 10px;
  border-radius: 3px;
}

.answer-text.correct {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.answer-text.incorrect {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.feedback {
  margin-top: 10px;
  padding: 10px;
  border-radius: 3px;
  font-style: italic;
}

.feedback.correct {
  background-color: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

  .feedback.incorrect {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }

  .answer-option {
    display: block;
    margin: 8px 0;
    cursor: pointer;
    padding: 8px;
    border-radius: 5px;
    transition: background-color 0.2s;
  }

  .answer-option:hover {
    background-color: #f8f9fa;
  }

  .answer-option input[type="radio"] {
    margin-right: 10px;
  }

  .btn-success {
    background-color: #28a745;
    color: white;
    margin-top: 20px;
  }

  .btn-success:hover {
    background-color: #218838;
  }

  .user-answer {
    font-weight: bold;
    color: #007bff;
  }

  .correct-answer {
    font-weight: bold;
    color: #28a745;
  }

  .indicators {
    font-size: 0.9em;
    font-weight: bold;
    margin-left: 10px;
  }

  .answer-text.correct .indicators {
    color: #28a745;
  }

  .answer-text.incorrect .indicators {
    color: #dc3545;
  }

  .feedback strong {
    color: #495057;
  }

  .feedback.correct strong {
    color: #155724;
  }

  .feedback.incorrect strong {
    color: #721c24;
  }
</style>

<script>
document.addEventListener('DOMContentLoaded', function() {
  const markdownInput = document.getElementById('markdownInput');
  const processBtn = document.getElementById('processBtn');
  const clearBtn = document.getElementById('clearBtn');
  const resultsSection = document.getElementById('resultsSection');
  const evaluationResults = document.getElementById('evaluationResults');
  const totalQuestions = document.getElementById('totalQuestions');
  const correctAnswers = document.getElementById('correctAnswers');
  const score = document.getElementById('score');

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
      html += `
        <div class="question-item">
          <div class="question-text">${question.number}. ${question.text}</div>
          <div class="answers">
      `;
      
      question.answers.forEach(answer => {
        html += `
          <label class="answer-option">
            <input type="radio" name="q${index}" value="${answer.letter}" required>
            <span class="answer-text">${answer.letter}) ${answer.text}</span>
          </label>
        `;
      });
      
      html += `
          </div>
        </div>
      `;
    });
    
    html += `
      <button type="submit" class="btn btn-success">Evaluar Respuestas</button>
      </form>
    `;
    
    evaluationResults.innerHTML = html;
    
    // Agregar event listener para el formulario
    document.getElementById('quizForm').addEventListener('submit', function(e) {
      e.preventDefault();
      evaluateAnswers(questions);
    });
  }

  function evaluateAnswers(questions) {
    const form = document.getElementById('quizForm');
    const formData = new FormData(form);
    let correctCount = 0;

    // Recopilar respuestas del usuario
    questions.forEach((question, index) => {
      const userAnswer = formData.get(`q${index}`);
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

      html += `
        <div class="question-item ${isCorrect ? 'correct' : 'incorrect'}">
          <div class="question-text">${question.number}. ${question.text}</div>
          <div class="answers">
      `;

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
        
        html += `
          <div class="answer-text ${answerClass}">
            ${answer.letter}) ${answer.text}
            <span class="indicators">${indicators}</span>
          </div>
        `;
      });

             html += `
           </div>
           <div class="feedback ${isCorrect ? 'correct' : 'incorrect'}">
             ${isCorrect ? 
               `¡Correcto!${question.explanation ? '<br><strong>Explicación:</strong> ' + question.explanation : ''}` : 
               `Tu respuesta: ${question.userAnswer || 'No respondida'} | Respuesta correcta: ${question.correctAnswer}${question.explanation ? '<br><strong>Explicación:</strong> ' + question.explanation : ''}`
             }
           </div>
         </div>
       `;
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
</script>
