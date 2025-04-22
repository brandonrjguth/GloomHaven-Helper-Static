const express = require('express');
const path = require('path');
const fs = require('fs'); // Import the file system module

const app = express();
const port = 3000;
app.use(express.static('Public/imgs/icons'));

const MONSTER_ABILITY_CARDS_DIR = path.join(__dirname, 'Public', 'imgs', 'monster-ability-cards', 'jaws-of-the-lion');

// --- Card Definitions ---
const CARD_BACK_IMG = '/imgs/card-back.png'; // Relative to Public dir

const PLAYER_BASE_CARDS = Array.from({ length: 20 }, (_, i) => `/imgs/player/gh-am-p1-${String(i + 1).padStart(2, '0')}.png`);
const MONSTER_BASE_CARDS = Array.from({ length: 20 }, (_, i) => `/imgs/monster/gh-am-m-${String(i + 1).padStart(2, '0')}.png`);

const PLAYER_BLESS_IMG = '/imgs/player-mod/Blessing/gh-am-pm-11.png';
const PLAYER_CURSE_IMG = '/imgs/player-mod/Curse/gh-am-pm-01.png';
const MONSTER_BLESS_IMG = '/imgs/monster-mod/Blessing/gh-am-pm-01.png'; // As specified
const MONSTER_CURSE_IMG = '/imgs/monster-mod/Curse/gh-am-mm-01.png';

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
    }

    draw() {
        // Check if a shuffle is pending from the previous draw
        if (this.shufflePending) {
            console.log(`${this.type} deck needs shuffle before drawing.`);
            this.shuffle(); // Perform the pending shuffle
            this.shufflePending = false; // Clear the flag
            return
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
        return {
            drawnCard: drawnCard,
            needsShuffle: this.shufflePending, // Indicate if shuffle is pending *after* this draw
            deckState: this.getState() // Include the updated deck state
        };
    }

    // Add Bless and Curse methods are not applicable to monster ability decks
    addBless() {
        if (this.activeBlessings < 10) {
            this.activeBlessings++;
            this.drawPile.push(this.blessImg); // Add to draw pile
            shuffleArray(this.drawPile); // Shuffle it in
            console.log(`Added Bless to ${this.type} deck. Count: ${this.activeBlessings}. Draw pile: ${this.drawPile.length}`);
            return true;
        }
        console.log(`Cannot add more Bless cards to ${this.type} deck (max 10).`);
        return false;
    }

    addCurse() {
        if (this.activeCurses < 10) {
            this.activeCurses++;
            this.drawPile.push(this.curseImg); // Add to draw pile
            shuffleArray(this.drawPile); // Shuffle it in
            console.log(`Added Curse to ${this.type} deck. Count: ${this.activeCurses}. Draw pile: ${this.drawPile.length}`);
            return true;
        }
         console.log(`Cannot add more Curse cards to ${this.type} deck (max 10).`);
        return false;
    }

    // Note: Removing Bless/Curse only affects the *count* for future shuffles.
    // Cards already shuffled in remain until drawn or deck is fully reset.
    removeBless() {
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
            return true;
        }
        return false;
    }

    removeCurse() {
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
                    this.discardPile.splice(curseIndexInDiscard, 1);
                    console.log(`Removed one Curse from ${this.type} discard pile.`);
                }
            }
            return true;
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
            curseImg: this.curseImg      // Will be null for monster ability decks
        };
    }
}

// --- Server State ---
// Using an object to hold decks, keyed by ID (e.g., 'player1', 'enemies')
const decks = {
    enemies: new Deck('monster') // Start with monster deck
};
let nextPlayerId = 1;

// --- Express Setup ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'Views'));
app.use(express.static(path.join(__dirname, 'Public'))); // Serve static files (CSS, images)
app.use(express.json()); // Middleware for parsing JSON bodies
app.use(express.urlencoded({ extended: true }));

// --- Routes ---
app.get('/', (req, res) => {
    // Read monster types from directory names
    fs.readdir(MONSTER_ABILITY_CARDS_DIR, { withFileTypes: true }, (err, entries) => {
        if (err) {
            console.error("Error reading monster ability card directory:", err);
            // Render the page without monster types if there's an error
            const deckStates = {};
            for (const id in decks) {
                deckStates[id] = decks[id].getState();
            }
            res.render('main', { decks: deckStates, cardBackImg: CARD_BACK_IMG, monsterTypes: [] });
            return;
        }

        // Filter for directories and get their names
        let monsterTypes = entries
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name);

        // Add "Basic" monster types if basic cards exist in their directories
        const basicMonsters = ['giant-viper', 'vermling-raider', 'zealot'];
        let basicMonsterPromises = basicMonsters.map(monster => {
            return new Promise((resolve) => {
                const monsterDir = path.join(MONSTER_ABILITY_CARDS_DIR, monster);
                fs.readdir(monsterDir, (err, files) => {
                    if (err) {
                        console.error(`Error reading basic monster directory ${monster}:`, err);
                        resolve(null); // Resolve with null if error
                        return;
                    }
                    const hasBasicCards = files.some(file => file.startsWith('jl-basic-') && !file.endsWith('-back.png'));
                    if (hasBasicCards) {
                        resolve(`Basic ${monster.replace('-', ' ')}`);
                    } else {
                        resolve(null);
                    }
                });
            });
        });

        Promise.all(basicMonsterPromises).then(basicTypes => {
            basicTypes.forEach(type => {
                if (type) {
                    monsterTypes.push(type);
                }
            });

            // Sort monster types alphabetically
            monsterTypes.sort();

            // Pass deck states and monster types to the template
            const deckStates = {};
            for (const id in decks) {
                deckStates[id] = decks[id].getState();
            }
            res.render('main', { decks: deckStates, cardBackImg: CARD_BACK_IMG, monsterTypes: monsterTypes });
        });
    });
});

// Render a single deck partial
app.get('/renderDeck/:deckId', (req, res) => {
    const deckId = req.params.deckId;
    const deck = decks[deckId];
    if (deck) {
        const deckState = deck.getState(); // Get the deck's state
        res.render('partials/deck', { 
            deckId: deckId, 
            deckState: deckState,
            cardBackImg: deckState.cardBackImg 
        });
    } else {
        res.status(404).send('Deck not found');
    }
});


// --- API Endpoints ---

// Get current state of all decks
app.get('/state', (req, res) => {
    const deckStates = {};
    for (const id in decks) {
        deckStates[id] = decks[id].getState();
    }
    res.json({ success: true, decks: deckStates, cardBackImg: CARD_BACK_IMG });
});

// Reset all decks (remove bless/curse, reshuffle)
app.post('/resetDecks', (req, res) => {
    console.log('Resetting decks (removing bless/curse and reshuffling)...');
    for (const deckId in decks) {
        const deck = decks[deckId];
        // Remove all Bless and Curse cards
        deck.drawPile = deck.drawPile.filter(card => card !== deck.blessImg && card !== deck.curseImg);
        deck.discardPile = deck.discardPile.filter(card => card !== deck.blessImg && card !== deck.curseImg);
        deck.activeBlessings = 0;
        deck.activeCurses = 0;
        deck.shufflePending = false; // Clear pending shuffle

        // Reshuffle the remaining cards
        deck.shuffle(); // The shuffle method already combines draw/discard and shuffles
    }
    console.log('Decks reset.');
    res.json({ success: true, message: 'Decks reset successfully.' });
});


// Add a player deck
app.post('/addPlayer', (req, res) => {
    const playerId = `player${nextPlayerId}`;
    if (nextPlayerId <= 4) {
        if (!decks[playerId]) {
            decks[playerId] = new Deck('player');
            console.log(`Added ${playerId}`);
            nextPlayerId++;
             res.json({ success: true, newDeckId: playerId, deckState: decks[playerId].getState() });
        } else {
             res.status(400).json({ error: `${playerId} already exists.` });
        }
    } else {
        res.status(400).json({ error: 'Maximum number of players (4) reached.' });
    }
});

// Remove a player deck
app.post('/removePlayer/:playerId', (req, res) => {
    const playerId = req.params.playerId;
    if (decks[playerId] && playerId.startsWith('player')) { // Ensure it's a player deck
        delete decks[playerId];
        console.log(`Removed ${playerId}`);
        // Decrement nextPlayerId if the removed player was the last one added
        if (playerId === `player${nextPlayerId - 1}`) {
            nextPlayerId--;
        }
        res.json({ success: true, message: `${playerId} removed successfully.` });
    } else if (decks[playerId] && !playerId.startsWith('player')) {
        res.status(400).json({ error: `Cannot remove non-player deck: ${playerId}` });
    }
    else {
        res.status(404).json({ error: 'Deck not found' });
    }
});

// Delete a deck by ID (can be player or monster ability deck)
app.post('/deleteDeck/:deckId', (req, res) => {
    const deckId = req.params.deckId;
    if (decks[deckId]) {
        delete decks[deckId];
        console.log(`Removed deck: ${deckId}`);
        // If it was a player deck, decrement playerCount (though client-side fetchInitialState handles this)
        // If it was a monster ability deck, no need to decrement a specific counter here,
        // as the client will refetch the state.
        res.json({ success: true, message: `Deck ${deckId} removed successfully.` });
    } else {
        res.status(404).json({ error: 'Deck not found' });
    }
});


// Generic function for deck actions
function handleDeckAction(req, res, action) {
    const deckId = req.params.deckId;
    const deck = decks[deckId];
    if (deck) {
        try {
            const result = deck[action](); // Call the deck method (draw, shuffle, addBless, etc.)
             // For draw, result is the card path. For others, it might be boolean/undefined.
            res.json({
                success: true,
                drawnCard: action === 'draw' ? result : undefined, // Only send drawnCard on draw action
                deckState: deck.getState() // Send full updated state
            });
        } catch (error) {
            console.error(`Error performing ${action} on ${deckId}:`, error);
            // Send specific error message if available (like deck empty)
            res.status(500).json({ error: error.message || `Failed to perform ${action}` });
        }
    } else {
        res.status(404).json({ error: 'Deck not found' });
    }
}

app.post('/draw/:deckId', (req, res) => handleDeckAction(req, res, 'draw'));
app.post('/shuffle/:deckId', (req, res) => handleDeckAction(req, res, 'shuffle'));
app.post('/bless/:deckId', (req, res) => handleDeckAction(req, res, 'addBless'));
app.post('/curse/:deckId', (req, res) => handleDeckAction(req, res, 'addCurse'));
app.post('/removeBless/:deckId', (req, res) => handleDeckAction(req, res, 'removeBless'));
app.post('/removeCurse/:deckId', (req, res) => handleDeckAction(req, res, 'removeCurse'));

// Object to keep track of the count of each monster ability deck added
const monsterAbilityDeckCounts = {};

// Add a monster ability deck
app.post('/addMonsterAbilityDeck', (req, res) => {
    const { monsterType } = req.body;

    if (!monsterType) {
        return res.status(400).json({ error: 'monsterType is required' });
    }

    let monsterDirName = monsterType;
    let isBasic = false;

    // Check if it's a basic monster type
    if (monsterType.startsWith('Basic ')) {
        isBasic = true;
        monsterDirName = monsterType.substring(6).replace(' ', '-'); // Get the original directory name
    }

    const monsterDir = path.join(MONSTER_ABILITY_CARDS_DIR, monsterDirName);

    fs.readdir(monsterDir, (err, files) => {
        if (err) {
            console.error(`Error reading monster directory ${monsterDirName}:`, err);
            return res.status(500).json({ error: `Failed to load cards for ${monsterType}` });
        }

        let baseCards = [];
        let cardBackImg = CARD_BACK_IMG; // Default to generic back

        if (isBasic) {
            // Filter for basic cards (excluding the back)
            baseCards = files
                .filter(file => file.startsWith('jl-basic-') && !file.endsWith('-back.png'))
                .map(file => `/imgs/monster-ability-cards/jaws-of-the-lion/${monsterDirName}/${file}`);

            // Find the basic card back (Corrected logic)
            const backFile = files.find(file => file.startsWith('jl-basic-') && file.endsWith('-back.png'));
             if (backFile) {
                 cardBackImg = `/imgs/monster-ability-cards/jaws-of-the-lion/${monsterDirName}/${backFile}`;
             }

            // Increment the count for this monster type and generate a unique ID
            monsterAbilityDeckCounts[monsterType] = (monsterAbilityDeckCounts[monsterType] || 0) + 1;
            const deckId = `monster-ability-${monsterType.toLowerCase().replace(/ /g, '-')}-${monsterAbilityDeckCounts[monsterType]}`;

            // Create and add the new deck, using the determined cardBackImg
            decks[deckId] = new Deck(`monster-ability-${monsterType}`, baseCards, cardBackImg);
            console.log(`Added monster ability deck for ${monsterType} with ID: ${deckId}`);

            res.json({ success: true, newDeckId: deckId, deckState: decks[deckId].getState() }); // cardBackImg is now in deckState

        } else {
            // Existing logic for non-basic monsters (assuming numbered cards 1-8 and a non-basic back)
            let prefix = '';
            switch (monsterType) {
                case 'black-sludge':
                    prefix = 'jl-ma-bs-';
                    break;
                case 'boss':
                    prefix = 'jl-ma-bo-';
                    break;
                case 'chaos-demon':
                    prefix = 'jl-ma-cd-';
                    break;
                case 'giant-viper':
                    prefix = 'jl-ma-gv-';
                    break;
                case 'imp':
                     prefix = 'jl-ma-im-';
                     break;
                case 'living-corpse':
                     prefix = 'jl-ma-lc-';
                     break;
                case 'living-spirit':
                     prefix = 'jl-ma-ls-';
                     break;
                case 'monstrosity':
                     prefix = 'jl-ma-mo-';
                     break;
                case 'stone-golem':
                     prefix = 'jl-ma-sg-';
                     break;
                case 'vermling-raider':
                     prefix = 'jl-ma-vr-';
                     break;
                case 'vermling-scout':
                     prefix = 'jl-ma-vs-';
                     break;
                case 'zealot':
                     prefix = 'jl-ma-ze-';
                     break;
                default:
                    // This case should ideally not be reached if the dropdown is populated correctly,
                    // but as a fallback, return an error if a non-basic type without a defined prefix is selected.
                    return res.status(400).json({ error: `Unknown non-basic monster type: ${monsterType}` });
            }

            // Generate card paths (1-8)
            baseCards = Array.from({ length: 8 }, (_, i) => `/imgs/monster-ability-cards/jaws-of-the-lion/${monsterDirName}/${prefix}${i + 1}.png`);

            // Add the back card image path
            const backFile = files.find(file => file === `${prefix}back.png`);
             if (backFile) {
                 cardBackImg = `/imgs/monster-ability-cards/jaws-of-the-lion/${monsterDirName}/${backFile}`;
             }

            if (baseCards.length === 0) {
                 return res.status(400).json({ error: `No ability cards found for ${monsterType}` });
            }

            // Increment the count for this monster type and generate a unique ID
            monsterAbilityDeckCounts[monsterType] = (monsterAbilityDeckCounts[monsterType] || 0) + 1;
            const deckId = `monster-ability-${monsterType.toLowerCase().replace(/ /g, '-')}-${monsterAbilityDeckCounts[monsterType]}`;

            // Create and add the new deck, using the determined cardBackImg
            decks[deckId] = new Deck(`monster-ability-${monsterType}`, baseCards, cardBackImg);
            console.log(`Added monster ability deck for ${monsterType} with ID: ${deckId}`);

            res.json({ success: true, newDeckId: deckId, deckState: decks[deckId].getState() }); // cardBackImg is now in deckState
        }
    });
});

// --- Start Server ---
app.listen(port, () => {
    console.log(`Gloomhaven Modifier App listening at http://localhost:${port}`);
    console.log('Initial decks:', Object.keys(decks));
});
