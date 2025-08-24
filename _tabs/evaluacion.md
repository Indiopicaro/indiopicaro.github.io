---
# the default layout is 'page'
icon: fas fa-clipboard-check
order: 5
---

# Evaluación de Cuestionarios

Esta herramienta te permite evaluar cuestionarios en formato Markdown de manera temporal. Simplemente pega tu cuestionario en el área de texto y haz clic en "Procesar" para obtener una evaluación instantánea.

<div class="evaluation-container">
  <div class="input-section">
    <div class="input-header">
      <h3>Pega tu cuestionario aquí:</h3>
      <button id="copyPromptBtn" class="btn btn-info">Copiar Prompt</button>
    </div>
    <textarea id="markdownInput" placeholder="Quiero que generes un cuestionario sobre [TEMA] con [NÚMERO] preguntas. El formato debe ser exactamente el siguiente:

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

Genera el cuestionario ahora."></textarea>
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

.input-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.input-header h3 {
  margin: 0;
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

  .btn-info {
    background-color: #17a2b8;
    color: white;
  }

  .btn-info:hover {
    background-color: #138496;
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

<script src="/assets/js/evaluation.js"></script>
