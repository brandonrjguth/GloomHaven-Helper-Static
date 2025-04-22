const decksContainer = document.getElementById('decks-container');
const addPlayerBtn = document.getElementById('add-player-btn');
const monsterSelect = document.getElementById('monster-select');
const addMonsterAbilityDeckBtn = document.getElementById('add-monster-ability-deck-btn');

// --- Card Definitions ---
const CARD_BACK_IMG = 'Public/imgs/card-back.png'; // Relative to Public dir

const PLAYER_BASE_CARDS = Array.from({ length: 20 }, (_, i) => `Public/imgs/player/gh-am-p1-${String(i + 1).padStart(2, '0')}.png`);
const MONSTER_BASE_CARDS = Array.from({ length: 20 }, (_, i) => `Public/imgs/monster/gh-am-m-${String(i + 1).padStart(2, '0')}.png`);

const PLAYER_BLESS_IMG = 'Public/imgs/player-mod/Blessing/gh-am-pm-11.png';
const PLAYER_CURSE_IMG = 'Public/imgs/player-mod/Curse/gh-am-pm-01.png';
const MONSTER_BLESS_IMG = 'Public/imgs/monster-mod/Blessing/gh-am-pm-01.png'; // As specified
const MONSTER_CURSE_IMG = 'Public/imgs/monster-mod/Curse/gh-am-mm-01.png';

// --- Utility Functions ---
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
}

// --- Deck Class ---
class Deck {
    constructor(type = 'player', baseCards = null, cardBackImg = CARD_BACK_IMG) { // 'player', 'monster', or specific monster type
        this.type = type;
        this.cardBackImg = cardBackImg; // Store the card back image

        if (baseCards) {
            this.baseCards = [...baseCards];
            // Monster ability decks don't have bless/curse in the same way
            this.blessImg = null;
            this.curseImg = null;
        } else {
            this.baseCards = type === 'player' ? [...PLAYER_BASE_CARDS] : [...MONSTER_BASE_CARDS];
            this.blessImg = type === 'player' ? PLAYER_BLESS_IMG : MONSTER_BLESS_IMG;
            this.curseImg = type === 'player' ? PLAYER_CURSE_IMG : MONSTER_CURSE_IMG;
        }

        this.drawPile = [...this.baseCards];
        this.discardPile = [];
        this.activeBlessings = 0;
        this.activeCurses = 0;
        this.lastDrawnCard = null; // Store the image path of the last drawn card
        this.shufflePending = false; // Flag to indicate if a shuffle is needed before the next draw

        shuffleArray(this.drawPile);
    }

    // Reshuffles discard into draw pile
    shuffle() {
        console.log(`Shuffling ${this.type} deck. Draw: ${this.drawPile.length}, Discard: ${this.discardPile.length}, Bless: ${this.activeBlessings}, Curse: ${this.activeCurses}`);
        this.drawPile.push(...this.discardPile);
        this.discardPile = [];

        shuffleArray(this.drawPile);
        this.lastDrawnCard = null; // Reset last drawn card on shuffle
        console.log(`Shuffled. Draw pile size: ${this.drawPile.length}`);
        return this.getState(); // Return state after shuffle
    }

    draw() {
        // Check if a shuffle is pending from the previous draw
        if (this.shufflePending) {
            console.log(`${this.type} deck needs shuffle before drawing.`);
            this.shuffle(); // Perform the pending shuffle
            this.shufflePending = false; // Clear the flag
            // After shuffling, the draw pile is ready, proceed to draw
        }

        if (this.drawPile.length === 0) {
            console.log(`${this.type} deck empty, shuffling discard...`);
            this.shuffle(); // Reshuffle if draw pile is empty
            if (this.drawPile.length === 0) { // Still empty after shuffle (no cards left at all)
                 this.lastDrawnCard = null;
                 console.log(`${this.type} deck has no cards left to draw.`);
                 throw new Error("Deck is completely empty.");
            }
        }

        const drawnCard = this.drawPile.pop();
        this.lastDrawnCard = drawnCard; // Store the drawn card image

        // Check if it's a Bless or Curse - these are removed from the game after drawing
        if (drawnCard === this.blessImg) {
            console.log(`Drew a Bless from ${this.type} deck (removed from game).`);
            this.activeBlessings = Math.max(0, this.activeBlessings - 1); // Decrement count
            // Do NOT add to discardPile
        } else if (drawnCard === this.curseImg) {
            console.log(`Drew a Curse from ${this.type} deck (removed from game).`);
            this.activeCurses = Math.max(0, this.activeCurses - 1); // Decrement count
            // Do NOT add to discardPile
        } else {
            // Regular card, move to discard
            this.discardPile.push(drawnCard); // Add the drawn card to the discard pile
            console.log(`Drew ${drawnCard} from ${this.type} deck. Draw: ${this.drawPile.length}, Discard: ${this.discardPile.length}`);
        }

        // Check if it's a Null or x2 card (triggers shuffle on *next* draw)
        const shuffleTriggerCards = [
            PLAYER_BASE_CARDS[18], // gh-am-p1-19.png (Null)
            PLAYER_BASE_CARDS[19], // gh-am-p1-20.png (x2)
            MONSTER_BASE_CARDS[18], // gh-am-m-19.png (Null)
            MONSTER_BASE_CARDS[19]  // gh-am-m-20.png (x2)
        ];

        if (shuffleTriggerCards.includes(drawnCard)) {
            console.log(`Drew a shuffle trigger card (${drawnCard}) from ${this.type} deck. Setting shuffle pending flag.`);
            this.shufflePending = true; // Set flag for next draw
        }

        // Get state for UI update
        return this.getState();
    }

    // Add Bless and Curse methods are not applicable to monster ability decks
    addBless() {
        if (this.blessImg === null) return false; // Not applicable to this deck type
        if (this.activeBlessings < 10) {
            this.activeBlessings++;
            this.drawPile.push(this.blessImg); // Add to draw pile
            shuffleArray(this.drawPile); // Shuffle it in
            console.log(`Added Bless to ${this.type} deck. Count: ${this.activeBlessings}. Draw pile: ${this.drawPile.length}`);
            return this.getState();
        }
        console.log(`Cannot add more Bless cards to ${this.type} deck (max 10).`);
        return false;
    }

    addCurse() {
        if (this.curseImg === null) return false; // Not applicable to this deck type
        if (this.activeCurses < 10) {
            this.activeCurses++;
            this.drawPile.push(this.curseImg); // Add to draw pile
            shuffleArray(this.drawPile); // Shuffle it in
            console.log(`Added Curse to ${this.type} deck. Count: ${this.activeCurses}. Draw pile: ${this.drawPile.length}`);
            return this.getState();
        }
         console.log(`Cannot add more Curse cards to ${this.type} deck (max 10).`);
        return false;
    }

    // Note: Removing Bless/Curse only affects the *count* for future shuffles.
    // Cards already shuffled in remain until drawn or deck is fully reset.
    removeBless() {
        if (this.blessImg === null) return false; // Not applicable to this deck type
        if (this.activeBlessings > 0) {
            this.activeBlessings--;
            console.log(`Decremented Bless count for ${this.type} deck. New count: ${this.activeBlessings}`);
            // Remove one Bless card from draw or discard if present
            const blessIndexInDraw = this.drawPile.indexOf(this.blessImg);
            if (blessIndexInDraw !== -1) {
                this.drawPile.splice(blessIndexInDraw, 1);
                console.log(`Removed one Bless from ${this.type} draw pile.`);
            } else {
                const blessIndexInDiscard = this.discardPile.indexOf(this.blessImg);
                if (blessIndexInDiscard !== -1) {
                    this.discardPile.splice(blessIndexInDiscard, 1);
                    console.log(`Removed one Bless from ${this.type} discard pile.`);
                }
            }
            return this.getState();
        }
        return false;
    }

    removeCurse() {
        if (this.curseImg === null) return false; // Not applicable to this deck type
        if (this.activeCurses > 0) {
            this.activeCurses--;
            console.log(`Decremented Curse count for ${this.type} deck. New count: ${this.activeCurses}`);
            // Remove one Curse card from draw or discard if present
            const curseIndexInDraw = this.drawPile.indexOf(this.curseImg);
            if (curseIndexInDraw !== -1) {
                this.drawPile.splice(curseIndexInDraw, 1);
                console.log(`Removed one Curse from ${this.type} draw pile.`);
            } else {
                const curseIndexInDiscard = this.discardPile.indexOf(this.curseImg);
                if (curseIndexInDiscard !== -1) {
                    this.discardPile.splice(curceIndexInDiscard, 1);
                    console.log(`Removed one Curse from ${this.type} discard pile.`);
                }
            }
            return this.getState();
        }
        return false;
    }

    // Get state for UI update
    getState() {
        return {
            type: this.type,
            drawPileCount: this.drawPile.length,
            discardPileCount: this.discardPile.length,
            activeBlessings: this.activeBlessings, // Will be 0 for monster ability decks
            activeCurses: this.activeCurses,     // Will be 0 for monster ability decks
            lastDrawnCard: this.lastDrawnCard,
            cardBackImg: this.cardBackImg, // Return the stored card back image
            blessImg: this.blessImg,     // Will be null for monster ability decks
            curseImg: this.curseImg,      // Will be null for monster ability decks
            needsShuffle: this.shufflePending // Include shuffle pending status
        };
    }

    // Reset deck to initial state (base cards only)
    reset() {
        this.drawPile = [...this.baseCards];
        this.discardPile = [];
        this.activeBlessings = 0;
        this.activeCurses = 0;
        this.lastDrawnCard = null;
        this.shufflePending = false;
        shuffleArray(this.drawPile);
        console.log(`Reset ${this.type} deck.`);
        return this.getState();
    }
}

// --- Client-Side State ---
const decks = {}; // Object to hold client-side Deck instances
let playerCount = 0; // Track player deck count

// --- Monster Ability Card Data (Client-side) ---
// This data was previously read from the file system server-side.
// Now it's hardcoded here. In a larger app, this might come from a static JSON file.
const MONSTER_ABILITY_CARD_DATA = {
    'black-sludge': {
        prefix: 'jl-ma-bs-',
        cardBack: 'Public/imgs/monster-ability-cards/jaws-of-the-lion/black-sludge/jl-ma-bs-back.png',
        cards: Array.from({ length: 8 }, (_, i) => `Public/imgs/monster-ability-cards/jaws-of-the-lion/black-sludge/jl-ma-bs-${i + 1}.png`)
    },
    'boss': {
        prefix: 'jl-ma-bo-',
        cardBack: 'Public/imgs/monster-ability-cards/jaws-of-the-lion/boss/jl-ma-bo-back.png',
        cards: Array.from({ length: 8 }, (_, i) => `Public/imgs/monster-ability-cards/jaws-of-the-lion/boss/jl-ma-bo-${i + 1}.png`)
    },
    'chaos-demon': {
        prefix: 'jl-ma-cd-',
        cardBack: 'Public/imgs/monster-ability-cards/jaws-of-the-lion/chaos-demon/jl-ma-cd-back.png',
        cards: Array.from({ length: 8 }, (_, i) => `Public/imgs/monster-ability-cards/jaws-of-the-lion/chaos-demon/jl-ma-cd-${i + 1}.png`)
    },
    'giant-viper': {
        prefix: 'jl-ma-gv-',
        cardBack: 'Public/imgs/monster-ability-cards/jaws-of-the-lion/giant-viper/jl-ma-gv-back.png',
        cards: Array.from({ length: 8 }, (_, i) => `Public/imgs/monster-ability-cards/jaws-of-the-lion/giant-viper/jl-ma-gv-${i + 1}.png`)
    },
     'imp': {
         prefix: 'jl-ma-im-',
         cardBack: 'Public/imgs/monster-ability-cards/jaws-of-the-lion/imp/jl-ma-im-back.png',
         cards: Array.from({ length: 8 }, (_, i) => `Public/imgs/monster-ability-cards/jaws-of-the-lion/imp/jl-ma-im-${i + 1}.png`)
     },
     'living-corpse': {
         prefix: 'jl-ma-lc-',
         cardBack: 'Public/imgs/monster-ability-cards/jaws-of-the-lion/living-corpse/jl-ma-lc-back.png',
         cards: Array.from({ length: 8 }, (_, i) => `Public/imgs/monster-ability-cards/jaws-of-the-lion/living-corpse/jl-ma-lc-${i + 1}.png`)
     },
     'living-spirit': {
         prefix: 'jl-ma-ls-',
         cardBack: 'Public/imgs/monster-ability-cards/jaws-of-the-lion/living-spirit/jl-ma-ls-back.png',
         cards: Array.from({ length: 8 }, (_, i) => `Public/imgs/monster-ability-cards/jaws-of-the-lion/living-spirit/jl-ma-ls-${i + 1}.png`)
     },
     'monstrosity': {
         prefix: 'jl-ma-mo-',
         cardBack: 'Public/imgs/monster-ability-cards/jaws-of-the-lion/monstrosity/jl-ma-ms-back.png',
         cards: Array.from({ length: 8 }, (_, i) => `Public/imgs/monster-ability-cards/jaws-of-the-lion/monstrosity/jl-ma-ms-${i + 1}.png`)
     },
     'stone-golem': {
         prefix: 'jl-ma-sg-',
         cardBack: 'Public/imgs/monster-ability-cards/jaws-of-the-lion/stone-golem/jl-ma-sg-back.png',
         cards: Array.from({ length: 8 }, (_, i) => `Public/imgs/monster-ability-cards/jaws-of-the-lion/stone-golem/jl-ma-sg-${i + 1}.png`)
     },
     'vermling-raider': {
         prefix: 'jl-ma-vr-',
         cardBack: 'Public/imgs/monster-ability-cards/jaws-of-the-lion/vermling-raider/jl-ma-vr-back.png',
         cards: Array.from({ length: 8 }, (_, i) => `Public/imgs/monster-ability-cards/jaws-of-the-lion/vermling-raider/jl-ma-vr-${i + 1}.png`)
     },
     'vermling-scout': {
         prefix: 'jl-ma-vs-',
         cardBack: 'Public/imgs/monster-ability-cards/jaws-of-the-lion/vermling-scout/jl-ma-vs-back.png',
         cards: Array.from({ length: 8 }, (_, i) => `Public/imgs/monster-ability-cards/jaws-of-the-lion/vermling-scout/jl-ma-vs-${i + 1}.png`)
     },
     'zealot': {
         prefix: 'jl-ma-zl-',
         cardBack: 'Public/imgs/monster-ability-cards/jaws-of-the-lion/zealot/jl-ma-zl-back.png',
         cards: Array.from({ length: 8 }, (_, i) => `Public/imgs/monster-ability-cards/jaws-of-the-lion/zealot/jl-ma-zl-${i + 1}.png`)
     },
    // Basic monster types with their specific cards
    'Basic giant-viper': {
        cardBack: 'Public/imgs/monster-ability-cards/jaws-of-the-lion/giant-viper/jl-basic-giant-viper-back.png',
        cards: [
            'Public/imgs/monster-ability-cards/jaws-of-the-lion/giant-viper/jl-basic-constrict.png',
            'Public/imgs/monster-ability-cards/jaws-of-the-lion/giant-viper/jl-basic-find-cover.png',
            'Public/imgs/monster-ability-cards/jaws-of-the-lion/giant-viper/jl-basic-swift-fangs.png',
            'Public/imgs/monster-ability-cards/jaws-of-the-lion/giant-viper/jl-basic-toxic-frenzy.png'
        ]
    },
    'Basic vermling-raider': {
        cardBack: 'Public/imgs/monster-ability-cards/jaws-of-the-lion/vermling-raider/jl-basic-vermling-raider-back.png', // Assuming a basic back exists
        cards: [
            'Public/imgs/monster-ability-cards/jaws-of-the-lion/vermling-raider/jl-basic-careful-throw.png',
            'Public/imgs/monster-ability-cards/jaws-of-the-lion/vermling-raider/jl-basic-dual-daggers.png',
            'Public/imgs/monster-ability-cards/jaws-of-the-lion/vermling-raider/jl-basic-nothing-special.png',
            'Public/imgs/monster-ability-cards/jaws-of-the-lion/vermling-raider/jl-basic-screaming-shot.png'
            // Add basic vermling raider card paths here if they exist and are needed
        ]
    },
     'Basic zealot': {
         cardBack: 'Public/imgs/monster-ability-cards/jaws-of-the-lion/zealot/jl-basic-zealot-back.png', // Assuming a basic back exists
         cards: [
            'Public/imgs/monster-ability-cards/jaws-of-the-lion/zealot/jl-basic-boil-blood.png',
            'Public/imgs/monster-ability-cards/jaws-of-the-lion/zealot/jl-basic-drain-life.png',
            'Public/imgs/monster-ability-cards/jaws-of-the-lion/zealot/jl-basic-hex-whip.png',
            'Public/imgs/monster-ability-cards/jaws-of-the-lion/zealot/jl-basic-vile-scourge.png'
             // Add basic zealot card paths here if they exist and are needed
         ]
     }
};

// Get the sorted list of monster types for the dropdown
const MONSTER_TYPES = Object.keys(MONSTER_ABILITY_CARD_DATA).sort();


// --- UI Rendering Functions ---

// Function to create the HTML for a single deck
function createDeckHTML(deckId, deckState) {
    let title = deckId.charAt(0).toUpperCase() + deckId.slice(1).replace(/-/g, ' '); // Capitalize first letter and replace hyphens
    const isMonsterAbilityDeck = deckId.startsWith('monster-ability-');
    const prefixToRemove = "Monster ability ";
    title = title.replace(prefixToRemove, "");
    title = title.charAt(0).toUpperCase()+ title.slice(1).replace(/-/g, ' ')

    // Determine initial image: card back if draw pile > 0, otherwise empty or a placeholder
    const initialImageHTML = deckState.drawPileCount > 0 ? `<img src="${deckState.cardBackImg}" alt="Deck" class="card-image">` : '<span>Empty</span>';

    let statusIndicatorsHTML = '';
    if (!isMonsterAbilityDeck) { // Only show bless/curse for player/monster decks
        statusIndicatorsHTML = `
            <div class="status-indicators">
                <div class="bless" id="bless-status-${deckId}">Blessings: ${deckState.activeBlessings}</div>
                <button data-action="addBless">+</button>
                <button data-action="removeBless">-</button>
                <div class="curse" id="curse-status-${deckId}">Curses: ${deckState.activeCurses}</div>
                <button data-action="addCurse">+</button>
                <button data-action="removeCurse">-</button>
            </div>
        `;
    }

    let deleteButtonHTML = '';
    if (deckId.startsWith('player')) {
        deleteButtonHTML = `<button class="delete-player-button" data-deck-id="${deckId}">Delete Player</button>`;
    } else if (isMonsterAbilityDeck) {
         deleteButtonHTML = `<button class="delete-monster-ability-button" data-deck-id="${deckId}">Delete Monster Deck</button>`;
    }


    return `
        <div class="deck" id="deck-${deckId}" data-deck-id="${deckId}">
            <h2>${title}</h2>

            <div class="deck-piles">
                <div class="pile combined-pile">
                    <div class="pile-counters">
                        <strong>Draw (<span id="draw-count-${deckId}">${deckState.drawPileCount}</span>)</strong>
                        <button data-action="shuffle"><img class="icon" src="Public/imgs/icons/Shuffle.png"></button>
                        <strong>Discard (<span id="discard-count-${deckId}">${deckState.discardPileCount}</span>)</strong>
                    </div>
                    <div class="card-display" id="combined-card-display-${deckId}" data-action="draw">
                        ${initialImageHTML}
                    </div>
                </div>
            </div>

            ${statusIndicatorsHTML}

            ${deleteButtonHTML}
        </div>
    `;
}


// --- UI Update Function ---
function updateDeckUI(deckId, deckState) {
    const deckElement = document.getElementById(`deck-${deckId}`);
    if (!deckElement) return; // Should not happen if called correctly

    // Use the specific cardBackImg from deckState if available, otherwise use a default
    const currentCardBackImg = deckState.cardBackImg || CARD_BACK_IMG;

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
     } else {
         deckElement.classList.remove('needs-shuffle');
     }
}


// --- Action Handlers ---
function handleAction(deckId, action) {
    console.log(`Performing ${action} on ${deckId}`);
    const deck = decks[deckId];
    if (!deck) {
        console.error(`Deck with ID ${deckId} not found.`);
        return;
    }

    let updatedState = null;
    try {
        switch (action) {
            case 'draw':
                updatedState = deck.draw();
                break;
            case 'shuffle':
                updatedState = deck.shuffle();
                break;
            case 'addBless':
                updatedState = deck.addBless();
                break;
            case 'removeBless':
                updatedState = deck.removeBless();
                break;
            case 'addCurse':
                updatedState = deck.addCurse();
                break;
            case 'removeCurse':
                updatedState = deck.removeCurse();
                break;
            default:
                console.error(`Unknown action: ${action}`);
                return;
        }

        if (updatedState) {
            updateDeckUI(deckId, updatedState);
        } else {
             console.log(`Action ${action} on ${deckId} did not result in a state change or was not applicable.`);
        }

    } catch (error) {
        console.error(`Error performing ${action} on ${deckId}:`, error);
        alert(`Error: ${error.message}`);
    }
}

function addPlayerDeck() {
    if (playerCount >= 4) {
        alert("Maximum number of players (4) reached.");
        return;
    }
    playerCount++;
    const deckId = `player${playerCount}`;
    decks[deckId] = new Deck('player');
    const deckHTML = createDeckHTML(deckId, decks[deckId].getState());
    decksContainer.insertAdjacentHTML('beforeend', deckHTML);
    updateDeckUI(deckId, decks[deckId].getState()); // Initial UI update

    if (playerCount >= 4) {
        addPlayerBtn.disabled = true;
        addPlayerBtn.textContent = "Max Players Reached";
    }
}

// Add monster ability deck handler
function addMonsterAbilityDeck() {
    const monsterType = monsterSelect.value;

    if (!monsterType) {
        alert("Please select a monster type.");
        return;
    }

    const monsterData = MONSTER_ABILITY_CARD_DATA[monsterType];
    if (!monsterData) {
        alert(`Card data not found for monster type: ${monsterType}`);
        return;
    }

    // Generate a unique ID for the monster deck instance
    const baseDeckId = `monster-ability-${monsterType.toLowerCase().replace(/ /g, '-')}`;
    let instanceCount = 1;
    let deckId = `${baseDeckId}-${instanceCount}`;
    while (decks[deckId]) {
        instanceCount++;
        deckId = `${baseDeckId}-${instanceCount}`;
    }

    decks[deckId] = new Deck(`monster-ability-${monsterType}`, monsterData.cards, monsterData.cardBack);
    const deckHTML = createDeckHTML(deckId, decks[deckId].getState());
    decksContainer.insertAdjacentHTML('beforeend', deckHTML);
    updateDeckUI(deckId, decks[deckId].getState()); // Initial UI update
}

// --- Reset All Decks Handler ---
function resetAllDecks() {
    console.log("Resetting all decks...");
    for (const deckId in decks) {
        if (decks.hasOwnProperty(deckId)) {
            const updatedState = decks[deckId].reset();
            updateDeckUI(deckId, updatedState);
        }
    }
    console.log("All decks reset.");
}

// Generic function to remove a deck (player or monster ability)
function removeDeck(deckId) {
    console.log(`Removing deck: ${deckId}`);
    if (decks[deckId]) {
        delete decks[deckId];
        const deckElement = document.getElementById(`deck-${deckId}`);
        if (deckElement) {
            deckElement.remove();
        }
        // If a player deck was removed, decrement playerCount
        if (deckId.startsWith('player')) {
             playerCount--;
             // Re-enable add player button if it was disabled
             if (playerCount < 4) {
                 addPlayerBtn.disabled = false;
                 addPlayerBtn.textContent = "Add Player Deck";
             }
        }
        console.log(`${deckId} removed successfully.`);
    } else {
        console.error(`Deck with ID ${deckId} not found.`);
    }
}


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Populate monster select dropdown
    MONSTER_TYPES.forEach(monsterType => {
        const option = document.createElement('option');
        option.value = monsterType;
        option.textContent = monsterType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); // Format for display
        monsterSelect.appendChild(option);
    });

    // Add event listeners to buttons
    addPlayerBtn.addEventListener('click', addPlayerDeck);
    addMonsterAbilityDeckBtn.addEventListener('click', addMonsterAbilityDeck);
    const resetAllBtn = document.getElementById('reset-all-btn');
    if (resetAllBtn) {
        resetAllBtn.addEventListener('click', resetAllDecks);
    }

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

    // Add event listeners to delete buttons (using event delegation)
    decksContainer.addEventListener('click', (event) => {
        const target = event.target;
        const deckId = target.dataset.deckId;

        if (target.classList.contains('delete-player-button') || target.classList.contains('delete-monster-ability-button')) {
            if (confirm(`Are you sure you want to delete ${deckId}?`)) {
                removeDeck(deckId);
            }
        }
    });


    // Initial creation of the default monster deck
    const initialMonsterDeckId = 'enemies';
    decks[initialMonsterDeckId] = new Deck('monster');
    const initialMonsterDeckHTML = createDeckHTML(initialMonsterDeckId, decks[initialMonsterDeckId].getState());
    decksContainer.insertAdjacentHTML('beforeend', initialMonsterDeckHTML);
    updateDeckUI(initialMonsterDeckId, decks[initialMonsterDeckId].getState()); // Initial UI update
});
