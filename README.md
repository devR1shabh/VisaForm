# AI-Based Visa Form Assistant

An AI-powered visa application assistant that helps users complete visa forms through an interactive conversational workflow. The system supports passport OCR extraction, guided chat-based data collection, validation, PDF generation, and application storage.

---

# Features

## AI-Assisted Conversational Workflow
- Interactive chat-based visa application flow
- Step-by-step guided data collection
- Smooth multi-step user experience
- Session persistence using sessionStorage

## Passport OCR Extraction
- Upload passport images
- Automatic extraction of:
  - Full Name
  - Passport Number
  - Nationality
  - Gender
  - Date of Birth
- OCR fallback support for manual correction

## Smart Validation System
- Country validation
- Nationality validation
- Gender validation
- Passport number validation
- Date validation
- Travel duration validation
- Prevents invalid or incomplete submissions

## Professional PDF Generation
- Clean administrative PDF export
- Professional visa application summary
- Structured sections and formatting
- Footer and metadata support

## Review & Edit Workflow
- Review all entered information before submission
- Edit application before PDF generation
- Prevent incomplete application generation

## Responsive UI
- Mobile responsive layout
- Smooth chat interface
- Modern clean design
- Sticky chat interaction flow

---

# Tech Stack

## Frontend
- React.js
- React Router
- Tailwind CSS
- Framer Motion
- Axios
- Lucide React

## Backend
- Node.js
- Express.js
- PDFKit
- Multer

## Database
- MongoDB
- Mongoose

## OCR / AI
- OCR-based passport extraction
- Conversational workflow handling

---

# Project Structure

```bash
VisaForm/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── utils/
│   │   ├── routes/
│   │   └── assets/
│
├── server/
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   ├── utils/
│   └── uploads/
│
├── README.md
└── package.json
```

---

# Core Workflow

## 1. Start Application
User opens the assistant and begins the visa application flow.

## 2. Upload Passport
User uploads passport image.

## 3. OCR Extraction
System extracts passport details automatically.

## 4. User Validation
User confirms and completes missing details.

## 5. Conversational Form Filling
Assistant asks:
- Destination country
- Visa type
- Duration
- Travel date
- Additional notes

## 6. Review Application
User reviews all information.

## 7. Generate PDF
Professional visa summary PDF is generated.

## 8. Store Application
Application is stored in MongoDB.

---

# Validation Logic

The system validates:
- Country names
- Nationalities
- Gender selection
- Passport number format
- Travel duration
- Valid dates
- Required fields

Invalid inputs are rejected immediately during the chat workflow.

---

# PDF Generation

Generated PDF includes:
- Application Header
- Application ID
- Submission Date
- Applicant Information
- Passport Information
- Visa Information
- Additional Notes
- Professional Footer

The PDF is designed to resemble a realistic administrative visa workflow document.

---

# Screenshots

## Landing Page

![Landing Page](./screenshots/landing-page.png)

---

## Chat Assistant

![Chat Assistant](./screenshots/chat-assistant.png)

---

## Passport OCR Upload

![Passport Upload](./screenshots/passport-upload.png)

---

## Review Application

![Review Application](./screenshots/review-page.png)

---

# Installation

## Clone Repository

```bash
git clone <your-repository-link>
```

---

## Frontend Setup

```bash
cd client
npm install
npm run dev
```

---

## Backend Setup

```bash
cd server
npm install
npm start
```

---

# Environment Variables

Create a `.env` file inside `server/`

```env
PORT=5000
DATABASE_URL=your_mongodb_connection_string
```

---

# Future Improvements

- Multi-language support
- Passport MRZ optimization
- AI travel recommendations
- Visa eligibility prediction
- Email notifications
- Cloud storage integration

---

# Key Highlights

- OCR-based passport extraction
- Conversational visa workflow
- Smart validation architecture
- Professional PDF generation
- MERN stack implementation
- Responsive user interface
- Real-world workflow simulation

---

# Author

Rishabh Vyas  
Full Stack Developer

## Connect With Me

- LinkedIn: [LinkedIn](https://linkedin.com/in/rishabhvyas-dev)
- GitHub: [GitHub](https://github.com/devR1shabh)
- Mail: [Mail](rishavvyas74@gmail.com)

---

# License

This project is built for educational and portfolio purposes.