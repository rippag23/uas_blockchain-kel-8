/**
 * IIFE (Immediately Invoked Function Expression) to encapsulate the application logic
 * and avoid polluting the global scope.
 */
(() => {
    // --- APPLICATION STATE ---
    const state = {
        candidates: [],
        votes: {}, // Object to store vote counts: { candidateName: count }
        votedNIKs: new Set(), // A set for efficient checking of who has already voted
        blockchain: [],
        messageTimeout: null,
    };

    // --- DOM ELEMENTS ---
    const elements = {
        candidateForm: document.getElementById('candidate-form'),
        candidateNameInput: document.getElementById('candidate-name'),
        candidateMessage: document.getElementById('candidate-message'),
        voteForm: document.getElementById('vote-form'),
        nikInput: document.getElementById('nik-input'),
        candidateSelect: document.getElementById('candidate-select'),
        voteButton: document.getElementById('vote-button'),
        voteMessage: document.getElementById('vote-message'),
        resultsList: document.getElementById('results-list'),
        blockchainVisual: document.getElementById('blockchain-visual'),
    };

    // --- UTILITY FUNCTIONS ---

    /**
     * Hashes a string message using the SHA-256 algorithm.
     * @param {string} message The string to hash.
     * @returns {Promise<string>} A promise that resolves to the hex-encoded hash.
     */
    async function sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Displays a message to the user for a limited time.
     * @param {HTMLElement} element The message container element.
     * @param {string} text The message to display.
     * @param {'success'|'error'} type The type of message.
     * @param {number} duration Duration in ms to show the message. 0 for permanent.
     */
    function displayMessage(element, text, type = 'success', duration = 3500) {
        element.textContent = text;
        element.className = `message ${type}`; // Remove 'show' initially
        
        // Use a short timeout to allow the browser to apply the initial state
        // before transitioning to the 'show' state, ensuring the animation runs.
        setTimeout(() => {
            element.classList.add('show');
        }, 10);
        
        if (state.messageTimeout) {
            clearTimeout(state.messageTimeout);
        }

        if (duration > 0) {
            state.messageTimeout = setTimeout(() => {
                element.classList.remove('show');
            }, duration);
        }
    }


    // --- BLOCKCHAIN CORE LOGIC (SIMULATION) ---
    // DISCLAIMER: This is a simplified, client-side simulation for educational purposes.
    // A real blockchain requires a decentralized network, consensus mechanisms (like Proof of Work
    // or Proof of Stake), and is not managed by a single client.

    /**
     * Creates the very first block in the chain, the "Genesis Block".
     */
    async function createGenesisBlock() {
        const genesisBlock = {
            index: 0,
            timestamp: Date.now(),
            data: 'Genesis Block',
            previousHash: '0'.repeat(64),
            hash: ''
        };
        genesisBlock.hash = await calculateHashForBlock(genesisBlock);
        state.blockchain.push(genesisBlock);
        renderBlockchain();
    }

    /**
     * Calculates the hash of a given block's contents.
     * @param {object} block The block to calculate the hash for.
     * @returns {Promise<string>} The calculated hash.
     */
    function calculateHashForBlock(block) {
        const blockString = `${block.index}${block.timestamp}${JSON.stringify(block.data)}${block.previousHash}`;
        return sha256(blockString);
    }
    
    /**
     * Creates and adds a new block to the blockchain.
     * @param {object} data The data to be stored in the new block.
     */
    async function addBlock(data) {
        const previousBlock = state.blockchain[state.blockchain.length - 1];
        const newBlock = {
            index: previousBlock.index + 1,
            timestamp: Date.now(),
            data: data,
            previousHash: previousBlock.hash,
            hash: ''
        };
        newBlock.hash = await calculateHashForBlock(newBlock);
        state.blockchain.push(newBlock);

        // In this simulation, we also add the NIK to a separate set for quick lookups.
        // In a real system, this check would be part of the decentralized validation process.
        if (data.nik) {
            state.votedNIKs.add(data.nik);
        }

        renderBlockchain();
    }

    // --- RENDERING / UI UPDATE FUNCTIONS ---

    /**
     * Renders the list of candidates in the voting dropdown.
     */
    function renderCandidates() {
        elements.candidateSelect.innerHTML = ''; // Clear existing options
        if (state.candidates.length === 0) {
            elements.candidateSelect.innerHTML = '<option value="" disabled selected>Tidak ada kandidat tersedia</option>';
            elements.candidateSelect.disabled = true;
            elements.voteButton.disabled = true;
        } else {
            const placeholder = '<option value="" disabled selected>Pilih seorang kandidat</option>';
            elements.candidateSelect.innerHTML = placeholder + state.candidates.map(c => `<option value="${c}">${c}</option>`).join('');
            elements.candidateSelect.disabled = false;
            elements.voteButton.disabled = false;
        }
    }

    /**
     * Renders the current voting results, sorted by vote count.
     */
    function renderResults() {
        elements.resultsList.innerHTML = '';
        if (state.candidates.length === 0) {
            elements.resultsList.innerHTML = '<li>Belum ada kandidat ditambahkan.</li>';
            return;
        }

        const sortedCandidates = [...state.candidates].sort((a, b) => (state.votes[b] || 0) - (state.votes[a] || 0));
        
        sortedCandidates.forEach(candidate => {
            const voteCount = state.votes[candidate] || 0;
            const li = document.createElement('li');
            li.innerHTML = `<strong>${candidate}</strong> - ${voteCount} suara`;
            elements.resultsList.appendChild(li);
        });
    }

    /**
     * Renders the visual representation of the blockchain ledger.
     */
    function renderBlockchain() {
        elements.blockchainVisual.innerHTML = ''; // Clear previous render
        // Render in reverse order (newest block on top)
        state.blockchain.slice().reverse().forEach(block => {
            const div = document.createElement('div');
            div.className = 'block';
            
            const dataString = typeof block.data === 'string' 
                ? block.data 
                : JSON.stringify(block.data, null, 2).replace(/\\"/g, '"');

            div.innerHTML = `
                <div class="block-header">Blok #${block.index}</div>
                <div><strong>Timestamp:</strong> ${new Date(block.timestamp).toLocaleString('id-ID')}</div>
                <div><strong>Data:</strong> <pre>${dataString}</pre></div>
                <div><strong>Hash Sebelumnya:</strong> ${block.previousHash.substring(0,20)}...</div>
                <div><strong>Hash:</strong> ${block.hash.substring(0,20)}...</div>
            `;
            elements.blockchainVisual.appendChild(div);
        });
    }

    // --- EVENT HANDLERS ---

    /**
     * Handles the submission of the "Add Candidate" form.
     */
    function handleAddCandidate(e) {
        e.preventDefault();
        const name = elements.candidateNameInput.value.trim();
        if (!name) {
            displayMessage(elements.candidateMessage, 'Nama kandidat tidak boleh kosong.', 'error');
            return;
        }
        if (state.candidates.includes(name)) {
            displayMessage(elements.candidateMessage, `Kandidat "${name}" sudah ada.`, 'error');
            return;
        }
        state.candidates.push(name);
        state.votes[name] = 0;
        elements.candidateNameInput.value = '';
        displayMessage(elements.candidateMessage, `Kandidat "${name}" berhasil ditambahkan.`, 'success');
        renderCandidates();
        renderResults();
    }

    /**
     * Handles the submission of the "Vote" form.
     */
    async function handleVote(e) {
        e.preventDefault();
        const nik = elements.nikInput.value.trim();
        const candidateName = elements.candidateSelect.value;

        if (!nik) {
            displayMessage(elements.voteMessage, 'Mohon masukkan NIK Anda.', 'error');
            return;
        }
        if (!candidateName) {
            displayMessage(elements.voteMessage, 'Mohon pilih seorang kandidat.', 'error');
            return;
        }

        // IMPORTANT: In this simulation, this check is client-side and easily bypassed.
        // In a real-world application, vote validation must happen on a secure, decentralized network.
        if (state.votedNIKs.has(nik)) {
            displayMessage(elements.voteMessage, 'NIK ini sudah digunakan untuk memilih. Suara ganda tidak diizinkan.', 'error');
            return;
        }

        elements.voteButton.disabled = true;
        elements.voteButton.textContent = 'Memproses...';

        try {
            const voteData = { nik, candidate: candidateName, timestamp: Date.now() };
            await addBlock(voteData);

            state.votes[candidateName] = (state.votes[candidateName] || 0) + 1;

            elements.nikInput.value = '';
            elements.candidateSelect.selectedIndex = 0;
            displayMessage(elements.voteMessage, `Suara untuk "${candidateName}" berhasil dicatat!`, 'success');
            renderResults();
        } catch (error) {
            console.error("Error submitting vote:", error);
            displayMessage(elements.voteMessage, 'Terjadi kesalahan saat memproses suara Anda.', 'error');
        } finally {
            elements.voteButton.disabled = false;
            elements.voteButton.textContent = 'Kirim Suara';
        }
    }


    // --- INITIALIZATION ---
    
    /**
     * Initializes the application.
     */
    async function initializeApp() {
        // Setup event listeners
        elements.candidateForm.addEventListener('submit', handleAddCandidate);
        elements.voteForm.addEventListener('submit', handleVote);
        
        // Create the Genesis Block and render initial UI state
        await createGenesisBlock();
        renderCandidates();
        renderResults();

        console.log("Blockchain Voting App Initialized (Educational Demo)");
    }

    // Run the app once the DOM is fully loaded
    document.addEventListener('DOMContentLoaded', initializeApp);

})();
