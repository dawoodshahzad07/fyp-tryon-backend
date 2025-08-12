document.addEventListener("DOMContentLoaded", function () {
    const userInput = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");
    const chatBox = document.querySelector(".chat-box");
    const micBtn = document.querySelector(".mic-btn");
    const imageUpload = document.getElementById("image-upload");
    const imagePreview = document.getElementById("image-preview");
    const loadingSpinner = document.getElementById("loading-spinner");

    let recognition;
    let isListening = false;

    // Check if the browser supports the Web Speech API
    if ("webkitSpeechRecognition" in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onstart = function () {
            isListening = true;
            micBtn.classList.add("active");
        };

        recognition.onresult = function (event) {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript;
            sendMessage();
        };

        recognition.onend = function () {
            isListening = false;
            micBtn.classList.remove("active");
        };

        recognition.onerror = function (event) {
            console.error("Speech recognition error:", event.error);
            appendMessage("ai", "Sorry, there was an error processing your voice input.");
            micBtn.classList.remove("active");
        };
    } else {
        console.warn("Web Speech API is not supported in this browser.");
        micBtn.disabled = true;
    }

    // Handle mic button click
    micBtn.addEventListener("click", function () {
        if (!isListening) {
            recognition.start();
        } else {
            recognition.stop();
        }
    });

    // Handle send button click
    sendBtn.addEventListener("click", sendMessage);

    // Handle Enter key press
    userInput.addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            sendMessage();
        }
    });

    // Handle image upload
    imageUpload.addEventListener("change", function () {
        const file = imageUpload.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                imagePreview.innerHTML = `<img src="${e.target.result}" alt="Selected Image">`;
            };
            reader.readAsDataURL(file);
        }
    });

    // Function to send a message
    function sendMessage() {
        const message = userInput.value.trim();
        const file = imageUpload.files[0];

        if (message === "" && !file) return;

        // Display user's message and image in the chat box with a loading bar
        const userMessageContainer = appendMessage("user", message, file, true);

        // Clear input fields
        userInput.value = "";
        imageUpload.value = "";
        imagePreview.innerHTML = "";

        // Send data to the appropriate endpoint
        if (file) {
            sendImageAndPrompt(file, message, userMessageContainer);
        } else {
            sendTextToGenerate(message, userMessageContainer);
        }
    }

    // Function to send text to the /generate endpoint
    function sendTextToGenerate(prompt, userMessageContainer) {
        fetch("/generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ prompt: prompt }),
        })
        .then(response => response.json())
        .then(data => {
            console.log("API Response:", data);
            // Remove the loading bar
            userMessageContainer.querySelector(".loading-bar").remove();
            if (data.message && data.filenames) {
                data.filenames.forEach(filename => {
                    appendImage("ai", filename);
                });
            } else if (data.error) {
                appendMessage("ai", data.error);
            }
        })
        .catch(error => {
            console.error("Error:", error);
            // Remove the loading bar
            userMessageContainer.querySelector(".loading-bar").remove();
            appendMessage("ai", "Sorry, there was an error processing your request.");
        });
    }

    // Function to send an image and prompt to the /edit endpoint
    function sendImageAndPrompt(file, prompt, userMessageContainer) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("prompt", prompt);

        fetch("/edit", {
            method: "POST",
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            console.log("API Response:", data);
            // Remove the loading bar
            userMessageContainer.querySelector(".loading-bar").remove();
            if (data.message && data.filenames) {
                data.filenames.forEach(filename => {
                    appendImage("ai", filename);
                });
            } else if (data.error) {
                appendMessage("ai", data.error);
            }
        })
        .catch(error => {
            console.error("Error:", error);
            // Remove the loading bar
            userMessageContainer.querySelector(".loading-bar").remove();
            appendMessage("ai", "Sorry, there was an error processing your request.");
        });
    }

    // Function to append a message to the chat box
    function appendMessage(sender, message, file, isLoading = false) {
        const messageContainer = document.createElement("div");
        messageContainer.classList.add("message-container", sender);

        const icon = document.createElement("img");
        icon.classList.add("message-icon");
        icon.src = sender === "user" ? "static/images/user.png" : "static/images/ai.png";
        icon.alt = sender;

        const messageElement = document.createElement("div");
        messageElement.classList.add("message", sender);
        messageElement.innerHTML = `<p>${message}</p>`;

        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const imageElement = document.createElement("img");
                imageElement.src = e.target.result;
                imageElement.classList.add("generated-image");
                messageElement.appendChild(imageElement);
            };
            reader.readAsDataURL(file);
        }

        // Add loading bar if it's a user message and loading is true
        if (isLoading && sender === "user") {
            const loadingBar = document.createElement("div");
            loadingBar.classList.add("loading-bar");
            messageElement.appendChild(loadingBar);
        }

        messageContainer.appendChild(icon);
        messageContainer.appendChild(messageElement);
        chatBox.appendChild(messageContainer);
        chatBox.scrollTop = chatBox.scrollHeight;

        return messageContainer;
    }

    // Function to append an image to the chat box with download and select buttons
    function appendImage(sender, filename) {
        const messageContainer = document.createElement("div");
        messageContainer.classList.add("message-container", sender);

        const icon = document.createElement("img");
        icon.classList.add("message-icon");
        icon.src = sender === "user" ? "static/images/user.png" : "static/images/ai.png";
        icon.alt = sender;

        const imageElement = document.createElement("img");
        imageElement.src = `/image/${filename}`;
        imageElement.classList.add("generated-image");

        // Create a download button
        const downloadButton = document.createElement("button");
        downloadButton.innerText = "Download";
        downloadButton.classList.add("download-button");

        // Add click event to download the image
        downloadButton.addEventListener("click", function () {
            const link = document.createElement("a");
            link.href = `/image/${filename}`;
            link.download = filename; // Set the filename for the downloaded image
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });

        // Create a select button
        const selectButton = document.createElement("button");
        selectButton.innerText = "Select Image";
        selectButton.classList.add("select-button");

        // Add click event to select the image
        selectButton.addEventListener("click", function () {
            // Set the selected image as the input for the next edit
            imagePreview.innerHTML = `<img src="/image/${filename}" alt="Selected Image">`;
            // Set the image file in the input field (for form submission)
            const fileInput = document.getElementById("image-upload");
            fetch(`/image/${filename}`)
                .then(response => response.blob())
                .then(blob => {
                    const file = new File([blob], filename, { type: "image/png" });
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    fileInput.files = dataTransfer.files;
                });
        });

        // Create a container for the buttons
        const buttonContainer = document.createElement("div");
        buttonContainer.classList.add("button-container");
        buttonContainer.appendChild(downloadButton);
        buttonContainer.appendChild(selectButton);

        // Create a container for the image and buttons
        const imageContainer = document.createElement("div");
        imageContainer.classList.add("image-container");
        imageContainer.appendChild(imageElement);
        imageContainer.appendChild(buttonContainer);

        messageContainer.appendChild(icon);
        messageContainer.appendChild(imageContainer);
        chatBox.appendChild(messageContainer);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // Sidebar toggle functionality
    const toggleBtn = document.getElementById("toggle-btn");
    const sidebar = document.getElementById("sidebar");
    const chatContainer = document.querySelector(".chat-container");

    // Toggle sidebar
    if (toggleBtn && sidebar && chatContainer) {
        toggleBtn.addEventListener("click", function () {
            sidebar.classList.toggle("collapsed");
            chatContainer.classList.toggle("expanded");
        });
    }
});
