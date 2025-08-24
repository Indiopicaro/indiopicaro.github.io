document.addEventListener('DOMContentLoaded', function() {
  const markdownInput = document.getElementById('markdownInput');
  const processBtn = document.getElementById('processBtn');
  const clearBtn = document.getElementById('clearBtn');
  const copyPromptBtn = document.getElementById('copyPromptBtn');
  const resultsSection = document.getElementById('resultsSection');
  const evaluationResults = document.getElementById('evaluationResults');
  const totalQuestions = document.getElementById('totalQuestions');
  const correctAnswers = document.getElementById('correctAnswers');
  const score = document.getElementById('score');

  if (!markdownInput || !processBtn || !clearBtn || !copyPromptBtn || !resultsSection || !evaluationResults) {
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

  copyPromptBtn.addEventListener('click', function() {
    const promptText = `Quiero que generes un cuestionario sobre [TEMA] con [NÚMERO] preguntas. El formato debe ser exactamente el siguiente:

1. Pregunta

a) Opción 1  
b) Opción 2 *  
c) Opción 3  
d) Opción 4  

Explicación: [Explicación de por qué la respuesta correcta es la marcada con *]

Instrucciones adicionales:  
- Marca la respuesta correcta con un asterisco (*) al final de la opción.  
- Cada pregunta debe ir numerada.  
- Cada pregunta debe tener exactamente 4 opciones.  
- Explica claramente la respuesta correcta.  
- Entrega todo en un solo bloque de texto para copiar y pegar.  

Genera el cuestionario ahora.`;

    // Crear un elemento temporal para copiar el texto
    const tempTextArea = document.createElement('textarea');
    tempTextArea.value = promptText;
    document.body.appendChild(tempTextArea);
    tempTextArea.select();
    document.execCommand('copy');
    document.body.removeChild(tempTextArea);

    // Mostrar feedback visual
    const originalText = copyPromptBtn.textContent;
    copyPromptBtn.textContent = '¡Copiado!';
    copyPromptBtn.style.backgroundColor = '#28a745';
    
    setTimeout(function() {
      copyPromptBtn.textContent = originalText;
      copyPromptBtn.style.backgroundColor = '#17a2b8';
    }, 2000);
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

  // El prompt ya está pre-cargado en el textarea, no necesitamos placeholder
});
