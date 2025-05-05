# ¿Cuánto sabes sobre XSS?

---

### 1. ¿Cuál es el objetivo principal de un ataque XSS?
- Robar ancho de banda del servidor
- Causar un DoS (Denial of Service)
- Inyectar y ejecutar código malicioso en el navegador de otro usuario
- Redirigir el tráfico DNS del servidor

**Respuesta correcta:** 3  
**Explicación:** El objetivo de un XSS es insertar código malicioso (usualmente JavaScript) en una página para que se ejecute en el navegador de otro usuario, aprovechando la confianza del navegador en el sitio web.

---

### 2. ¿Qué tipo de XSS se produce cuando el atacante logra guardar el script en el servidor, por ejemplo en un comentario?
- XSS Reflejado
- XSS Persistente
- XSS DOM-Based
- XSS en Cache

**Respuesta correcta:** 2  
**Explicación:** El XSS persistente (o almacenado) ocurre cuando el script queda guardado en la base de datos del servidor y se ejecuta cada vez que un usuario accede a ese contenido (como en comentarios, perfiles, etc.).

---

### 3. ¿Cuál de los siguientes métodos es el más adecuado para evitar la ejecución de scripts maliciosos en un campo de entrada de usuario que será mostrado en HTML?

```javascript
element.textContent = entradaUsuario;
```
- document.write(entradaUsuario);
- element.innerHTML = entradaUsuario;
- eval(entradaUsuario);

**Respuesta correcta:** 1  
**Explicación:** `textContent` es seguro porque inserta texto como tal sin interpretarlo como HTML o JS. En cambio, `innerHTML`, `document.write` o `eval` ejecutan o interpretan código.

---

### 4. ¿Qué función cumple la cabecera `Content-Security-Policy`?
- Permitir múltiples conexiones simultáneas
- Evitar que un sitio web cargue imágenes externas
- Aumentar la velocidad de carga de la web
- Definir qué recursos están permitidos en la página, incluyendo scripts

**Respuesta correcta:** 4  
**Explicación:** CSP permite establecer una política de seguridad para controlar qué scripts (y otros recursos) se pueden ejecutar en la página, bloqueando intentos de XSS si no cumplen con esa política.

---

### 5. ¿Cuál de los siguientes ejemplos representa un intento de XSS DOM-Based?

```html
https://victima.com?nombre=<script>alert(1)</script>
```
- https://victima.com/#<img src=x onerror=alert(1)>
- Un comentario malicioso guardado en el servidor
- Un iframe con un keylogger embebido

**Respuesta correcta:** 2  
**Explicación:** El XSS basado en DOM ocurre cuando la vulnerabilidad está en el lado cliente. Si el código JS del sitio procesa `location.hash` o similar sin validación, un payload como ese puede ejecutarse.

---

### 6. ¿Qué tipo de XSS se basa exclusivamente en la manipulación del DOM sin que intervenga el servidor?
- Reflected XSS
- Stored XSS
- DOM-Based XSS
- Server-Side XSS

**Respuesta correcta:** 3  
**Explicación:** El DOM-Based XSS ocurre cuando el código JavaScript del lado cliente interpreta datos manipulables (como `document.location`, `document.referrer`, etc.) sin sanitización, sin que el servidor los procese.

---

### 7. ¿Cuál es la vulnerabilidad de este fragmento de código?

```javascript
let userInput = location.search;
document.getElementById("output").innerHTML = userInput;
```
- No tiene ninguna vulnerabilidad
- Es vulnerable a Reflected XSS
- Solo es vulnerable si se ejecuta en un navegador antiguo
- Es un ejemplo de protección contra XSS

**Respuesta correcta:** 2  
**Explicación:** Aquí se inyecta directamente la entrada del usuario (`location.search`) en el HTML sin sanitización, lo cual puede ser explotado con un payload reflejado. 
