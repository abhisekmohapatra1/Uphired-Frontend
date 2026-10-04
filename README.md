# Uphired-Frontend

A modern Next.js frontend for Uphired - an AI-powered job hunting platform. Built with React, TypeScript, and Tailwind CSS, this application provides a seamless interface for job search, profile management, authentication, and real-time workflow tracking.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [Pages & Routes](#pages--routes)
- [Components](#components)
- [API Integration](#api-integration)
- [State Management](#state-management)
- [Authentication](#authentication)
- [Real-time Updates](#real-time-updates)
- [Styling](#styling)
- [Configuration](#configuration)
- [Installation & Setup](#installation--setup)
- [Development](#development)
- [Build & Production](#build--production)
- [Type Checking](#type-checking)
- [Linting](#linting)
- [Environment Variables](#environment-variables)
- [License](#license)

## Overview

Uphired-Frontend is the client-side application for the Uphired job hunting platform. It connects to the Uphired-Backend API to orchestrate AI-powered job searches, display ranked results, manage user profiles and resumes, and provide real-time visibility into multi-agent workflow execution.

### Key Features

- **Job Search Interface**: Intuitive form for searching jobs with filters (skills, experience, preferred sites, market)
- **Real-time Workflow Tracking**: WebSocket integration for live progress updates during job searches
- **User Authentication**: Secure login/register with JWT token management
- **Profile Management**: Complete user profile with resume upload and parsing
- **Results Visualization**: Clean display of ranked jobs with match scores, skills, and source links
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Type Safety**: Full TypeScript coverage
- **Modern Next.js**: App Router architecture with server components

## Architecture

The frontend follows Next.js 15 App Router architecture with a clear separation of concerns.

```text
+-------------------------------------------------------------+
¦                    Next.js App Router                      ¦
¦                      (app/ directory)                      ¦
+-------------------------------------------------------------¦
¦  Layout (Root)  ¦  Pages: /, /auth, /profile, /results     ¦
+-------------------------------------------------------------¦
¦                    Reusable Components                     ¦
¦                        (app/components)                    ¦
+-------------------------------------------------------------¦
¦                    Client-side Logic                      ¦
¦  Hooks, API calls, WebSocket, LocalStorage, TypeScript    ¦
+-------------------------------------------------------------¦
¦                        Backend API                        ¦
¦              (Uphired-Backend - FastAPI)                  ¦
+-------------------------------------------------------------+
```

## Tech Stack

| Category | Technology | Purpose |
|---|---|---|
| **Framework** | [Next.js 15](https://nextjs.org/) | React framework with App Router |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | Type safety and developer experience |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Utility-first CSS framework |
| **UI/UX** | [React 19](https://react.dev/) | Component-based UI library |
| **State** | React Hooks (useState, useEffect) | Local component state management |
| **HTTP Client** | Native Fetch API | API communication |
| **WebSocket** | Native WebSocket API | Real-time workflow updates |
| **Fonts** | [Geist](https://vercel.com/font) | Optimized font loading via next/font |
| **Linting** | [ESLint](https://eslint.org/) | Code quality and consistency |
| **Build Tool** | [Turbopack](https://turbo.build/pack) | Fast development and build tooling |

## Project Structure

```text
Uphired-Frontend/
+-- app/                      # Next.js App Router directory
¦   +-- components/           # Reusable React components
¦   ¦   +-- JobSearchForm.tsx # Job search input form
¦   ¦   +-- JobResults.tsx    # Job results display component
¦   ¦   +-- WorkflowStatus.tsx # Real-time workflow progress
¦   +-- auth/                 # Authentication page
¦   ¦   +-- page.tsx          # Login/Register page
¦   +-- profile/              # User profile page
¦   ¦   +-- page.tsx          # Profile management and resume upload
¦   +-- Nav.tsx               # Navigation bar component
¦   +-- globals.css           # Global styles and Tailwind directives
¦   +-- layout.tsx            # Root layout with metadata
¦   +-- page.tsx              # Home page
¦   +-- results/              # Results page
¦       +-- page.tsx          # Job search results page
+-- public/                   # Static assets
¦   +-- globe.svg
¦   +-- next.svg
¦   +-- vercel.svg
¦   +-- window.svg
+-- .gitignore                # Git ignore rules
+-- eslint.config.mjs         # ESLint configuration
+-- next-env.d.ts             # Next.js TypeScript declarations
+-- next.config.ts            # Next.js configuration
+-- package.json              # Dependencies and scripts
+-- package-lock.json         # Locked dependency versions
+-- postcss.config.mjs        # PostCSS configuration
+-- README.md                 # Project documentation
+-- tsconfig.json             # TypeScript configuration
+-- tsconfig.tsbuildinfo      # TypeScript build cache
```

## Features

### 1. Job Search
- Search for jobs by query, skills, experience level
- Filter by preferred job sites (LinkedIn, Indeed, RemoteOK, Naukri, Wellfound, YCombinator)
- Choose market scope (Global/India)
- Async search with real-time progress tracking

### 2. Real-time Workflow Monitoring
- Live WebSocket connection to backend
- Step-by-step workflow progress (Planner ? Browser ? Extractor ? Ranker ? Summary)
- Execution log streaming
- Error visibility
- Auto-reconnection handling

### 3. User Management
- Registration with email/password
- JWT-based authentication
- Persistent login via localStorage
- Automatic logout on token expiration

### 4. Profile & Resume Management
- Complete profile form (personal info, contact, links)
- Skills management
- Work history, education, certifications tracking
- Resume PDF upload
- Automatic resume parsing to populate profile fields
- Resume download/view

### 5. Job Results
- Ranked job listings with match scores (0-1)
- Display of skills, company, location, salary, source
- Direct links to original job postings
- Deduplication and relevance-based ordering
- Empty state handling
