# Campus Circular (UPN - Sede Breña)

> **Código de Proyecto:** APS-2026-CC01  
> **Curso:** Administración de Proyectos de Software (ISOF1402A)

Plataforma colaborativa para la optimización del ciclo de vida y reutilización de recursos académicos y técnicos entre estudiantes de la Universidad Privada del Norte.

## 🛠️ Stack Tecnológico

* **Frontend:** Angular 17+ (SPA, TypeScript, Responsive / WCAG 2.1 AA)
* **Backend:** Spring Boot 3+ (Java 17+, Maven, Spring Security, JPA/Hibernate)
* **Seguridad:** JSON Web Tokens (JWT Stateless) y validación de correo @upn.pe
* **Base de Datos:** MySQL 8.0
* **CI/CD & DevOps:** GitHub Actions, Docker, MailHog

## 👥 Equipo del Proyecto

* **Angel Yelsin Oliden Torres** - Project Manager
* **Omar Daniel Mejias Romero** - Backend & Security Developer
* **Luis Francisco Molero Ugarte** - Frontend Developer & UI/UX
* **Alanis Milagrito de Jesus Altamirano Diaz** - Data Architect & QA Engineer
* **Maicol Neiser Villanueva Silva** - DevOps Lead

## 📁 Estructura del Repositorio

```text
campus-circular/
├── backend/            # API REST Spring Boot y persistencia JPA
├── frontend/           # Aplicación Web SPA Angular
├── docs/               # ERS (1.2.1), DER y arquitectura (1.2.2), minutas
├── .github/workflows/  # Pipelines de integración y despliegue continuo (CI/CD)
└── README.md           # Ficha técnica y documentación de arranque
```

## 🚀 Despliegue Local Rápido

### Requisitos previos
* JDK 17+ y Apache Maven
* Node.js v18+ y Angular CLI (`npm install -g @angular/cli`)
* Docker y Docker Compose (para MySQL y MailHog)

### Backend local
1. Levanta MySQL y MailHog con `docker compose up -d`.
2. Define `JWT_SECRET` como una variable de entorno con al menos 32 bytes UTF-8.
   No guardes su valor en el repositorio. Por ejemplo, en PowerShell:
   `$env:JWT_SECRET = "<secreto-local-de-32-o-mas-bytes>"`.
3. Inicia Spring Boot desde `backend` con `.\mvnw.cmd spring-boot:run`.

El backend envía los códigos de verificación a MailHog por SMTP en el puerto
1025; se pueden consultar en [http://localhost:8025](http://localhost:8025).
El catálogo público admite paginación con `page` y `size`; crear publicaciones
requiere autenticación y acepta `categoryId`, `titulo`, `descripcion`,
`condicion`, `modalidad` y `precioSolidario` (máximo S/ 80.00).