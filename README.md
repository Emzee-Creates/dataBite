# dataBite 📊
### *AI-Driven Data Storytelling & Natural Language Visualization*

**dataBite** is a professional business intelligence tool that allows users to upload datasets and generate complex, interactive visualizations using natural language or voice commands. 

Built to solve the limitations of standard web speech APIs, it features a custom **Push-to-Talk (PTT)** system powered by **Deepgram** to ensure reliable performance across all modern browsers, including privacy-focused ones like Brave.

---

## 🚀 Key Features

* **Natural Language to Chart:** Utilizes Gemini AI to perform "Structured Reasoning," converting raw CSV data into precise Recharts JSON configurations.
* **Deepgram Voice Interface:** A robust WebSocket implementation that bypasses the limitations of the built-in browser `SpeechRecognition` API.
* **Push-to-Talk (PTT):** Industry-standard keyboard shortcuts (`Spacebar`) for a seamless analytical experience.
* **Insight Reasoning:** The AI provides a "Context -> Insight -> Action" explanation for every chart generated, which is read aloud via an integrated TTS engine.
* **Instant Export:** Download generated insights as high-resolution PNGs for immediate use in reports or presentations.

---

## 🛠️ The Technical Challenge (Why?)

Standard browser speech APIs often fail in privacy-focused environments due to strictly enforced fingerprinting protections. 

**The Solution:**
I architected a custom streaming solution using the **Deepgram SDK** and **WebSockets**. This approach:
1.  **Direct Communication:** Bypasses "Google-tunnel" blocks by communicating directly with Deepgram's API.
2.  **State-Guard Pattern:** Implemented a custom React locking mechanism (`isProcessing` state) to prevent hardware race conditions and "ghost" microphone restarts during rapid toggling.
3.  **Low Latency:** Sends audio chunks in 250ms intervals for near-instant transcription.



---

## 💻 Tech Stack

* **Frontend:** React 18, Vite, Tailwind CSS
* **Intelligence:** Google Gemini AI (LLM)
* **Voice-to-Text:** Deepgram SDK (WebSocket)
* **Data Visualization:** Recharts
* **Icons/UI:** Lucide-React, html2canvas

---

## ⚙️ Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/YOUR_USERNAME/databite.git](https://github.com/YOUR_USERNAME/databite.git)
    cd databite
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the root directory and add your API keys:
    ```env
    VITE_GEMINI_API_KEY=your_gemini_key
    VITE_DEEPGRAM_API_KEY=your_deepgram_key
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.