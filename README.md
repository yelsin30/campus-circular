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