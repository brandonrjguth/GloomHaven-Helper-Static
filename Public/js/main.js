const decksContainer = document.getElementById('decks-container');
const addPlayerBtn = document.getElementById('add-player-btn');
const monsterSelect = document.getElementById('monster-select');
const addMonsterAbilityDeckBtn = document.getElementById('add-monster-ability-deck-btn');

// Initialize playerCount based on decks rendered server-side.
// This requires getting the initial deck data from the server-rendered HTML.
// A safer approach is to pass this count from the server or fetch initial state.
// For now, we'll assume the initial render includes the monster deck.
let playerCount = 0; // Will be updated after initial render or fetch


// --- UI Update Function ---
        function updateDeckUI(deckId, deckState) {
            const deckElement = document.getElementById(`deck-${deckId}`);
            if (!deckElement) return; // Should not happen if called correctly

            // Use the specific cardBackImg from deckState if available, otherwise use a default
            const currentCardBackImg = deckState.cardBackImg || '/imgs/card-back.png';

            const drawButton = deckElement.querySelector('.controls button[data-action="draw"]'); // More specific selector

            // Get references to the new combined pile elements
            const drawCountSpan = document.getElementById(`draw-count-${deckId}`);
            const discardCountSpan = document.getElementById(`discard-count-${deckId}`);
            const combinedCardDisplay = document.getElementById(`combined-card-display-${deckId}`);
            const blessStatus = document.getElementById(`bless-status-${deckId}`);
            const curseStatus = document.getElementById(`curse-status-${deckId}`);

            // Determine if it's a monster ability deck
            const isMonsterAbilityDeck = deckId.startsWith('monster-ability-');

            // Update counts in the specific spans
            if (drawCountSpan) drawCountSpan.textContent = deckState.drawPileCount;
            if (discardCountSpan) discardCountSpan.textContent = deckState.discardPileCount;

            // Only update bless/curse status for non-monster ability decks
            if (!isMonsterAbilityDeck && blessStatus && curseStatus) {
                blessStatus.textContent = `Blessings: ${deckState.activeBlessings}`;
                curseStatus.textContent = `Curses: ${deckState.activeCurses}`;
            }

            // Update Combined Card Display Image
            let displayContent = '';
            if (deckState.lastDrawnCard) {
                // Show the last drawn card if it exists
                displayContent = `<img src="${deckState.lastDrawnCard}" alt="Last Drawn" class="card-image">`;
                // Optional: Add visual indication if drawn card was Bless/Curse, only for non-monster ability decks
                if (!isMonsterAbilityDeck) {
                    if (deckState.lastDrawnCard === deckState.blessImg) {
                        displayContent += ' <span class="indicator-bless">(Bless Drawn)</span>';
                    } else if (deckState.lastDrawnCard === deckState.curseImg) {
                        displayContent += ' <span class="indicator-curse">(Curse Drawn)</span>';
                    }
                }
            } else if (deckState.drawPileCount > 0) {
                // If no card was just drawn, show card back if draw pile has cards
                displayContent = `<img src="${currentCardBackImg}" alt="Deck" class="card-image">`;
            } else {
                // Otherwise, show empty state
                displayContent = '<span>Empty</span>';
            }
            if (combinedCardDisplay) combinedCardDisplay.innerHTML = displayContent;


             // Update shuffle indicator and button state
             if (deckState.needsShuffle) {
                 deckElement.classList.add('needs-shuffle'); // Add visual indicator
                 // Optionally disable draw button until shuffled
                 // drawButton.disabled = true;
                 // drawButton.textContent = "Shuffle Needed";
             } else {
                 deckElement.classList.remove('needs-shuffle');
                 // drawButton.disabled = false;
                 // drawButton.textContent = "Draw";
             }
        }

// --- API Request Handler ---
async function sendRequest(url, method = 'POST', body = null) {
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };
        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
            let errorMsg = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch (e) { /* Ignore if response is not JSON */ }
            throw new Error(errorMsg);
        }
        return await response.json(); // Assuming server always returns JSON
    } catch (error) {
        console.error(`Error sending request to ${url}:`, error);
        // Display error more prominently (optional)
        alert(`Error: ${error.message}`);
        throw error; // Re-throw to stop further processing in the calling function
    }
}

// --- Action Handlers ---
        async function handleAction(deckId, action) {
            console.log(`Performing ${action} on ${deckId}`);
            const url = `/${action}/${deckId}`; // Construct URL based on action and deckId
            try {
                const data = await sendRequest(url);
                if (data.success) {
                    console.log(`Response for ${action} on ${deckId}:`, data);
                    // Update UI with the returned deck state and cardBackImg
                    updateDeckUI(deckId, data.deckState, data.deckState.cardBackImg); // Pass cardBackImg from deckState

                    // If a shuffle is needed after this draw, the next draw click will trigger it.
                    // No need to explicitly call shuffle here.

                } else {
                    // Handle potential server-side logical errors if success is false
                     alert(`Action failed: ${data.error || 'Unknown error'}`);
                }
            } catch (error) {
                // Error already logged/alerted in sendRequest
            }
        }

async function addPlayerDeck() {
    if (playerCount >= 4) {
        alert("Maximum number of players (4) reached.");
        return;
    }
    console.log("Adding player deck...");
    try {
        const data = await sendRequest('/addPlayer');
        if (data.success && data.newDeckId) {
            console.log("Player deck added:", data);
            // Fetch the rendered HTML for the new deck
            const deckHTMLResponse = await fetch(`/renderDeck/${data.newDeckId}`);
            if (deckHTMLResponse.ok) {
                const newDeckHTML = await deckHTMLResponse.text();
                decksContainer.insertAdjacentHTML('beforeend', newDeckHTML);
                playerCount++; // Increment player count
                if (playerCount >= 4) {
                    addPlayerBtn.disabled = true; // Disable button if max reached
                    addPlayerBtn.textContent = "Max Players Reached";
                }
            } else {
                alert(`Failed to fetch HTML for new player deck: ${deckHTMLResponse.statusText}`);
            }
        } else {
             alert(`Failed to add player deck: ${data.error || 'Unknown error'}`);
        }
    } catch (error) {
        // Error already logged/alerted in sendRequest
    }
}

// Add monster ability deck handler
async function addMonsterAbilityDeck() {
    const monsterType = monsterSelect.value;

    if (!monsterType) {
        alert("Please select a monster type.");
        return;
    }

    console.log(`Adding monster ability deck for ${monsterType}...`);
    try {
        const data = await sendRequest('/addMonsterAbilityDeck', 'POST', { monsterType: monsterType });
        if (data.success && data.newDeckId) {
            console.log("Monster ability deck added:", data);
            // Fetch the rendered HTML for the new deck
            const deckHTMLResponse = await fetch(`/renderDeck/${data.newDeckId}`);
            if (deckHTMLResponse.ok) {
                const newDeckHTML = await deckHTMLResponse.text();
                decksContainer.insertAdjacentHTML('beforeend', newDeckHTML);
                // Update the UI immediately for the new deck
                updateDeckUI(data.newDeckId, data.deckState);
            } else {
                alert(`Failed to fetch HTML for new monster ability deck: ${deckHTMLResponse.statusText}`);
            }
        } else {
             alert(`Failed to add monster ability deck: ${data.error || 'Unknown error'}`);
        }
    } catch (error) {
        // Error already logged/alerted in sendRequest
    }
}

// --- Reset All Decks Handler ---
async function resetAllDecks() {
    console.log("Resetting all decks...");
    try {
        const data = await sendRequest('/resetDecks'); // Corrected endpoint name
        if (data.success) {
            console.log("Decks reset successfully:", data); // Updated log message
            // After resetting, reload the page to fetch the initial state from the server
            window.location.reload();
        } else {
            alert(`Failed to reset all decks: ${data.error || 'Unknown error'}`);
        }
    } catch (error) {
        // Error already logged/alerted in sendRequest
    }
}

// --- Remove Player Deck Handler ---
async function removePlayerDeck(deckId) {
    console.log(`Removing player deck: ${deckId}`);
    try {
        const data = await sendRequest(`/removePlayer/${deckId}`);
        if (data.success) {
            console.log(`${deckId} removed successfully:`, data);
            // After removing, reload the page to fetch the initial state from the server
            window.location.reload();
        } else {
            alert(`Failed to remove player deck ${deckId}: ${data.error || 'Unknown error'}`);
        }
    } catch (error) {
        // Error already logged/alerted in sendRequest
    }
}


// Add event listeners - only once when the page loads
function initializeEventListeners() {
    // Add monster ability deck button
    addMonsterAbilityDeckBtn.addEventListener('click', addMonsterAbilityDeck, {once: true});
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    
    // Add event listeners to delete buttons (using event delegation)
    decksContainer.addEventListener('click', (event) => {
        const target = event.target;
        const deckId = target.dataset.deckId;

        if (target.classList.contains('delete-player-button')) {
            if (confirm(`Are you sure you want to delete ${deckId}?`)) {
                removePlayerDeck(deckId);
            }
        } else if (target.classList.contains('delete-monster-ability-button')) {
             if (confirm(`Are you sure you want to delete ${deckId}?`)) {
                 removeDeck(deckId); // Use a generic removeDeck function
             }
        }
    });

    // Add event listener for the Reset All Decks button
    const resetAllBtn = document.getElementById('reset-all-btn');
    if (resetAllBtn) {
        resetAllBtn.addEventListener('click', resetAllDecks);
    }
});

// Add event delegation for deck actions (draw, shuffle, bless, curse, etc.)
decksContainer.addEventListener('click', (event) => {
    const target = event.target;
    // Find the closest element with a data-action attribute (buttons or the combined card display)
    const actionElement = target.closest('[data-action]');

    if (actionElement) {
        const deckElement = actionElement.closest('.deck');
        const deckId = deckElement ? deckElement.dataset.deckId : null;
        const action = actionElement.dataset.action;

        if (deckId && action) {
            handleAction(deckId, action);
        }
    }
});


// Generic function to remove a deck (player or monster ability)
async function removeDeck(deckId) {
    console.log(`Removing deck: ${deckId}`);
    try {
        const data = await sendRequest(`/deleteDeck/${deckId}`);
        if (data.success) {
            console.log(`${deckId} removed successfully:`, data);
            // Remove the deck element from the DOM
            const deckElement = document.getElementById(`deck-${deckId}`);
            if (deckElement) {
                deckElement.remove();
            }
            // If a player deck was removed, decrement playerCount (optional, fetchInitialState handles this on reload)
            if (deckId.startsWith('player')) {
                 playerCount--;
                 // Re-enable add player button if it was disabled
                 if (playerCount < 4) {
                     addPlayerBtn.disabled = false;
                     addPlayerBtn.textContent = "Add Player Deck";
                 }
            }
        } else {
            alert(`Failed to remove deck ${deckId}: ${data.error || 'Unknown error'}`);
        }
    } catch (error) {
        // Error already logged/alerted in sendRequest
    }
}

// Initial check to disable button if already at max players (e.g., page reload)
// This will be handled by fetchInitialState now.
// if (playerCount >= 4) {
//     addPlayerBtn.disabled = true;
//     addPlayerBtn.textContent = "Max Players Reached";
// }
