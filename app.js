// JavaScript for Venn Diagram Drag-and-Drop Game

// Wait for the DOM to fully load before executing scripts
document.addEventListener('DOMContentLoaded', () => {
	// Initialize variables
	let draggedWord = null; // Currently dragged word element
	let actionHistory = []; // History of actions for undo functionality
	let isDropped = false; // Flag to track if the word was dropped onto a valid target

	// Game state to track word placements
	let gameState = {}; // Will be populated dynamically based on targetCombinations

	// Word limits for each combined group
	// Adjust these limits based on your game's requirements
	// Word limits for each region
	const regionWordLimits = {
		region1: 2, // Outside Region A
		region2: 2, // Outside Region B
		region4: 2, // Outside Region C
		region3: 1, // Overlap of A and B
		region5: 1, // Overlap of A and C
		region6: 1, // Overlap of B and C
		region7: 1, // Overlap of A, B, and C
	};

	// Correct answers mapping for each region
	let correctAnswers = {}; // Will be derived based on targetCombinations

	// Define target combinations
	let targetCombinations = []; // Will be set based on user input

	// Reference to essential HTML elements
	const wordList = document.getElementById('word-list');
	const diagramContainer = document.getElementById('diagram-container');
	const hintMessage = document.getElementById('hint-message');
	const configTextarea = document.getElementById('config-textarea');
	const configSubmitButton = document.getElementById('config-submit');
	const resetButton = document.getElementById('reset-button');
	const undoButton = document.getElementById('undo-button');
	const hintButton = document.getElementById('hint-button');
	const dropSound = document.getElementById('drop-sound');
	const uploadButton = document.getElementById('upload-json-button');
	const uploadInput = document.getElementById('json-file-input');
	/**
	 * Sets up event listeners for configuration submission, buttons, and initializes saved configurations.
	 */
	function setupEventListeners() {
		// Handle configuration submission
		// configSubmitButton.addEventListener('click', handleConfigSubmit);
		document
			.getElementById('upload-json-button')
			.addEventListener('click', () => {
				const fileInput = document.getElementById('json-file-input');
				const uploadMessage = document.getElementById('upload-message');

				if (fileInput.files.length === 0) {
					uploadMessage.textContent =
						'Please select a JSON file to upload.';
					uploadMessage.style.color = '#dc3545'; // Red color for error
					return;
				}

				const file = fileInput.files[0];
				const reader = new FileReader();

				reader.onload = function (event) {
					try {
						const json = JSON.parse(event.target.result);
						// Validate and handle the JSON data as needed
						handleConfigSubmit(JSON.stringify(json), true);
						uploadMessage.textContent =
							'JSON file uploaded successfully!';
						uploadMessage.style.color = '#28a745'; // Green color for success
					} catch (error) {
						uploadMessage.textContent = 'Invalid JSON file.';
						uploadMessage.style.color = '#dc3545'; // Red color for error
					}
				};

				reader.readAsText(file);
			});
		// Handle Reset, Undo, and Hint buttons
		resetButton.addEventListener('click', resetGame);
		undoButton.addEventListener('click', undoLastAction);
		hintButton.addEventListener('click', provideHints);

		// Initialize drag-and-drop for regions
		setupRegionEventListeners();

		// Initialize drag-and-drop for regions
		setupRegionEventListeners();

		// Set up saved games event listeners
		setupSavedGamesEventListeners();

		// List saved games on initial load
		listSavedGames();
	}

	/**
	 * Handles the submission of the configuration from the text area.
	 * Parses the input, validates it, extracts unique words,
	 * initializes the game, and saves the configuration to localStorage.
	 */
	function handleConfigSubmit(text, save = true) {
		const configText = text;

		if (!configText) {
			alert('Please paste your targetCombinations in the text area.');
			return;
		}

		let parsedCombinations;
		try {
			parsedCombinations = JSON.parse(configText);
		} catch (error) {
			alert(
				'Invalid JSON format. Please ensure your input is valid JSON.'
			);
			console.error('JSON Parse Error:', error);
			return;
		}

		// Validate the structure of targetCombinations
		if (
			!Array.isArray(parsedCombinations) ||
			parsedCombinations.length === 0
		) {
			alert(
				'Invalid structure. targetCombinations should be a non-empty array of arrays.'
			);
			return;
		}

		for (let combo of parsedCombinations) {
			if (!Array.isArray(combo) || combo.length === 0) {
				alert(
					'Each targetCombination should be a non-empty array of words.'
				);
				return;
			}
		}

		// Extract unique words
		const uniqueWords = extractUniqueWords(parsedCombinations);

		// Initialize the game with the new configuration
		initializeGame(uniqueWords, parsedCombinations);

		// Save the configuration to localStorage with Unix timestamp
		if (save) saveConfiguration(parsedCombinations);

		alert('Game configured successfully!');
	}

	/**
	 * Extracts all unique words from the targetCombinations.
	 * @param {Array<Array<string>>} combinations - The target combinations.
	 * @returns {Array<string>} - An array of unique words.
	 */
	function extractUniqueWords(combinations) {
		const wordSet = new Set();
		combinations.forEach((combo) => {
			combo.forEach((word) => wordSet.add(word));
		});
		return Array.from(wordSet);
	}

	/**
	 * Initializes the game based on unique words and target combinations.
	 * @param {Array<string>} uniqueWords - The unique words extracted from combinations.
	 * @param {Array<Array<string>>} combinations - The target combinations.
	 */
	function initializeGame(uniqueWords, combinations) {
		// Reset the game UI and state
		resetGameUI();

		// Populate the word list
		populateWordList(uniqueWords);

		// Set the gameState with all words set to null
		uniqueWords.forEach((word) => {
			gameState[word] = null;
		});

		// Define correctAnswers based on targetCombinations
		// correctAnswers = deriveCorrectAnswers(combinations);

		// Update the global targetCombinations
		targetCombinations = combinations;

		// Clear any existing action history
		actionHistory = [];

		// Clear hints
		hintMessage.textContent = '';
	}

	/**
	 * Resets the game UI by removing all dropped words and resetting regions.
	 */
	function resetGameUI() {
		// Remove all dropped words from the diagram
		document
			.querySelectorAll('.dropped-word')
			.forEach((word) => word.remove());

		// Reset game state
		for (let word in gameState) {
			gameState[word] = null;
		}

		// Clear action history
		actionHistory = [];

		// Clear hints
		hintMessage.textContent = '';
	}

	/**
	 * Populates the word list in the UI with the provided words.
	 * @param {Array<string>} words - The words to display.
	 */
	function populateWordList(words) {
		const wordListContainer = document.getElementById('word-list');
		// wordListContainer.innerHTML = '<h2>Drag these words onto the Venn diagram:</h2>'; // Reset the word list
		wordListContainer.innerHTML = ''; // Reset the word list
		words.forEach((wordText) => {
			const wordElem = document.createElement('div');
			wordElem.className = 'word';
			wordElem.draggable = true;
			wordElem.textContent = wordText;
			wordListContainer.appendChild(wordElem);
			addWordEventListeners(wordElem);
		});
	}

	/**
	 * Adds event listeners to a word element to handle dragging.
	 * @param {HTMLElement} wordElem - The word element to add listeners to.
	 */
	function addWordEventListeners(wordElem) {
		// Drag start event
		wordElem.addEventListener('dragstart', function (e) {
			draggedWord = this;
			e.dataTransfer.setData('text/plain', this.textContent);
			this.style.opacity = '0.5';
			isDropped = false; // Reset the flag at the start of a drag
		});

		// Drag end event
		wordElem.addEventListener('dragend', function (e) {
			this.style.opacity = '1';

			// If the word was not dropped onto a valid target
			if (!isDropped) {
				if (this.classList.contains('dropped-word')) {
					// Remove the word from the diagram
					this.remove();

					// Create a new word element in the word list
					const wordElem = document.createElement('div');
					wordElem.className = 'word';
					wordElem.draggable = true;
					wordElem.textContent = this.textContent;
					wordList.appendChild(wordElem);
					addWordEventListeners(wordElem);

					// Update game state
					gameState[this.textContent] = null;

					// Record the action for undo functionality
					actionHistory.push({
						type: 'return',
						wordElement: this,
						previousRegion: this.dataset.region,
						wordText: this.textContent,
					});

					// Provide feedback (optional)
					displayMessage(
						`Returned "${this.textContent}" to the word list.`
					);
				}
			}
		});
	}

	/**
	 * Sets up drag-and-drop event listeners for all regions.
	 */
	function setupRegionEventListeners() {
		document.querySelectorAll('.region').forEach((region) => {
			// Allow dropping
			region.addEventListener('dragover', handleDragOver);

			// Visual feedback on drag enter
			region.addEventListener('dragenter', handleDragEnter);

			// Revert visual feedback on drag leave
			region.addEventListener('dragleave', handleDragLeave);

			// Handle drop event
			region.addEventListener('drop', handleDrop);
		});
	}

	/**
	 * Handles the dragover event.
	 * @param {DragEvent} e
	 */
	function handleDragOver(e) {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
	}

	/**
	 * Handles the dragenter event.
	 * @param {DragEvent} e
	 */
	function handleDragEnter(e) {
		this.style.fillOpacity = '0.8';
		this.style.stroke = '#007BFF'; // Optional: Change border color on hover
	}

	/**
	 * Handles the dragleave event.
	 * @param {DragEvent} e
	 */
	function handleDragLeave(e) {
		this.style.fillOpacity = '0.5';
		this.style.stroke = '#000000'; // Revert border color
	}

	/**
	 * Handles the drop event on regions.
	 * @param {DragEvent} e
	 */
	function handleDrop(e) {
		e.preventDefault();
		// this.style.fillOpacity = '0.5';
		this.style.stroke = '#000000';

		isDropped = true; // The word was dropped onto a region
		const targetRegionId = this.id;

		// Enforce word limit
		const currentWordCount = countWordsInRegion(targetRegionId);
		const regionLimit = regionWordLimits[targetRegionId];

		if (currentWordCount >= regionLimit) {
			alert(`This region can only have ${regionLimit} word(s).`);
			return;
		}

		// Get the position relative to the diagram container
		const diagramContainerRect = diagramContainer.getBoundingClientRect();
		const x =
			e.clientX - diagramContainerRect.left - draggedWord.offsetWidth / 2;
		const y =
			e.clientY - diagramContainerRect.top - draggedWord.offsetHeight / 2;

		// Create a new element for the dropped word
		const droppedWordElem = document.createElement('div');
		droppedWordElem.className = 'dropped-word word';
		droppedWordElem.draggable = true;
		droppedWordElem.style.left = `${x}px`;
		droppedWordElem.style.top = `${y}px`;
		droppedWordElem.textContent = draggedWord.textContent;
		droppedWordElem.dataset.region = targetRegionId; // Store the region ID

		// Add event listeners to the new word
		addWordEventListeners(droppedWordElem);

		// Add the word to the diagram container
		diagramContainer.appendChild(droppedWordElem);

		// Update game state
		gameState[draggedWord.textContent] = targetRegionId;

		// Record the action for undo functionality
		actionHistory.push({
			type: 'drop',
			wordElement: droppedWordElem,
			originalParent: draggedWord.parentNode,
			originalNextSibling: draggedWord.nextSibling,
			wordText: draggedWord.textContent,
			coordinates: { x, y },
			previousRegion: null,
		});

		// Remove the word from its original location
		draggedWord.remove();

		// Play drop sound
		dropSound.play();
		checkCombinations();
		// Add a simple animation
		droppedWordElem.animate(
			[{ transform: 'scale(0)' }, { transform: 'scale(1)' }],
			{
				duration: 300,
				easing: 'ease-out',
			}
		);

		// // Check for victory condition
		// checkVictory();

		// // Check for combination matches
		// checkCombinations();
	}

	/**
	 * Counts how many words are currently placed in a specific region.
	 * @param {string} regionId - The ID of the region.
	 * @returns {number} - The number of words in the region.
	 */
	function countWordsInRegion(regionId) {
		let count = 0;
		for (let word in gameState) {
			if (gameState[word] === regionId) {
				count++;
			}
		}
		return count;
	}

	/**
	 * Saves a configuration object to localStorage with the current Unix timestamp.
	 * @param {Array<Array<string>>} combinations - The target combinations to save.
	 */
	function saveConfiguration(combinations) {
		const timestamp = Date.now();
		const key = `vennGame_${timestamp}`;
		const config = {
			targetCombinations: combinations,
			createdAt: timestamp,
		};
		localStorage.setItem(key, JSON.stringify(config));
	}

	/**
	 * Resets the game to its initial state, clearing all placements and restoring the word list.
	 */
	function resetGame() {
		// Remove all dropped words from the diagram
		document
			.querySelectorAll('.dropped-word')
			.forEach((word) => word.remove());

		// Clear the word list
		// wordList.innerHTML = '<h2>Drag these words onto the Venn diagram:</h2>';

		// Reset game state
		for (let word in gameState) {
			gameState[word] = null;
		}

		// Reset correct answers
		correctAnswers = {};

		// Clear action history
		actionHistory = [];

		// Clear hints
		hintMessage.textContent = '';

		// Optionally, reset any other game states

		// Play reset confetti
		confetti({
			particleCount: 100,
			spread: 70,
			origin: { y: 0.6 },
		});

		const uniqueWords = extractUniqueWords(targetCombinations);
		populateWordList(uniqueWords);

		// Provide feedback
		displayMessage('Game has been reset.');
	}

	/**
	 * Undoes the last action taken by the user (either a drop or a return).
	 */
	function undoLastAction() {
		if (actionHistory.length === 0) {
			alert('No actions to undo.');
			return;
		}

		const lastAction = actionHistory.pop();

		if (lastAction.type === 'drop') {
			// Remove the word from the diagram
			lastAction.wordElement.remove();

			// Recreate the word element in the word list
			const wordElem = document.createElement('div');
			wordElem.className = 'word';
			wordElem.draggable = true;
			wordElem.textContent = lastAction.wordText;
			wordList.appendChild(wordElem);
			addWordEventListeners(wordElem);

			// Restore the word to its original location
			if (lastAction.originalNextSibling) {
				lastAction.originalParent.insertBefore(
					wordElem,
					lastAction.originalNextSibling
				);
			} else {
				lastAction.originalParent.appendChild(wordElem);
			}

			// Update game state
			gameState[lastAction.wordText] = null;

			// Provide feedback
			displayMessage(`Undid placement of "${lastAction.wordText}".`);
		} else if (lastAction.type === 'return') {
			// Remove the word from the word list
			const wordElems = Array.from(wordList.children).filter(
				(elem) => elem.textContent === lastAction.wordText
			);
			wordElems.forEach((elem) => elem.remove());

			// Recreate the dropped word element
			const droppedWordElem = document.createElement('div');
			droppedWordElem.className = 'dropped-word word';
			droppedWordElem.draggable = true;
			droppedWordElem.textContent = lastAction.wordText;
			droppedWordElem.style.left = lastAction.position
				? lastAction.position.left
				: '50%';
			droppedWordElem.style.top = lastAction.position
				? lastAction.position.top
				: '50%';
			droppedWordElem.dataset.region = lastAction.previousRegion;

			// Add event listeners to the new word
			addWordEventListeners(droppedWordElem);

			// Append to the diagram container
			diagramContainer.appendChild(droppedWordElem);

			// Update game state
			gameState[lastAction.wordText] = lastAction.previousRegion;

			// Provide feedback
			displayMessage(
				`Returned "${lastAction.wordText}" to its previous region.`
			);
		}

		// Reset region styles if necessary
		document.querySelectorAll('.region').forEach((region) => {
			// region.style.fillOpacity = '0.5';
			region.style.stroke = '#000000';
		});
	}

	// Function to collect words from combined regions
	function getCombinedRegionWords() {
		// Define the combined regions as per your requirement
		const combinedRegions = [
			['region1', 'region3', 'region5', 'region7'],
			['region2', 'region3', 'region6', 'region7'],
			['region4', 'region5', 'region6', 'region7'],
		];

		const combinedWords = [];

		combinedRegions.forEach((group) => {
			let words = [];
			group.forEach((regionId) => {
				// Select all dropped words in the current region
				const wordsInRegion = document.querySelectorAll(
					`.dropped-word[data-region="${regionId}"]`
				);
				wordsInRegion.forEach((wordElem) => {
					words.push(wordElem.textContent.trim());
				});
			});
			// Sort the words alphabetically
			words.sort();
			combinedWords.push(words);
		});

		return combinedWords; // Returns an array of arrays
	}

	// Function to check if current placement matches any target combination
	function checkCombinations() {
		const currentCombinedWords = getCombinedRegionWords();
		console.log('currentCombinedWords', currentCombinedWords);
		const allGroupsMatch = areArraysEqual(
			currentCombinedWords,
			targetCombinations
		);

		console.log('allGroupsMatch', allGroupsMatch);
		if (allGroupsMatch) {
			triggerSuccess();
			return true; // Exit after finding a match
		}
		return false;
	}

	// Function to handle successful combination
	function triggerSuccess() {
		// Trigger confetti
		confetti({
			particleCount: 300,
			spread: 120,
			origin: { y: 0.6 },
		});

		// Notify the user
		displayMessage(
			'🎉 Congratulations! You have achieved a correct combination. 🎉'
		);
		console.log('WINNER');
		// Optionally, disable further drops or reset the game
		// disableGame(); // Implement as needed
	}

	function areArraysEqual(arr1, arr2) {
		if (arr1.length !== arr2.length) {
			return false;
		}

		const sortedArr1 = arr1.map((subArr) => [...subArr].sort());
		const sortedArr2 = arr2.map((subArr) => [...subArr].sort());
		console.log('sortedArr1', sortedArr1, sortedArr2);

		const psortedArr1 = sortedArr1
			.map((innerArr) => innerArr.slice().sort())
			.sort();
		const psortedArr2 = sortedArr2
			.map((innerArr) => innerArr.slice().sort())
			.sort();

		console.log('sortedArr1', psortedArr1, psortedArr2);

		return JSON.stringify(psortedArr1) === JSON.stringify(psortedArr2);
	}

	// Function to display messages to the user
	function displayMessage(message) {
		hintMessage.textContent = message;
		// Optionally, clear the message after a delay
		setTimeout(() => {
			hintMessage.textContent = '';
		}, 3000);
	}

	/**
	 * Provides hints based on the current game state.
	 * Displays feedback on correct/incorrect placements and missing words.
	 */
	function provideHints() {
		let hints = '';
		console.log('Hint clicked');
		// Check if center word is correct
		const centerWord = Object.keys(gameState).find(
			(word) => gameState[word] === 'region7'
		);
		console.log('centerWord', centerWord);
		if (centerWord) {
			if (findCommonElement(targetCombinations) === centerWord) {
				hints += '✅ The center word is correct.\n';
			} else {
				hints += '❌ The center word is incorrect.\n';
				hintMessage.textContent = hints;

				return;
			}
		} else {
			hints += '❓ The center word is missing.\n';
			hintMessage.textContent = hints;

			return;
		}

		const combinedWords = getCombinedRegionWords();

		if (
			combinedWords[0].length < 5 ||
			combinedWords[1].length < 5 ||
			combinedWords[2].length < 5
		) {
			hints += '❓ Some regions have missing words.\n';
			hintMessage.textContent = hints;

			return;
		} else if (
			!compareElementOccurrences(combinedWords, targetCombinations)
		) {
			hints +=
				'All regions have the required number of words but inner regions have incorrect word(s).\n';
		} else {
			hints +=
				' All regions have the required number of words but outer regions have incorrect word(s).\n';
		}

		// Display hints
		hintMessage.textContent = hints;
	}

	function compareElementOccurrences(arr1, arr2) {
		const countOccurrences = (arr) => {
			return arr.flat().reduce((acc, val) => {
				acc[val] = (acc[val] || 0) + 1;
				return acc;
			}, {});
		};

		const count1 = countOccurrences(arr1);
		const count2 = countOccurrences(arr2);

		const allKeys = new Set([
			...Object.keys(count1),
			...Object.keys(count2),
		]);

		let allCountsEqual = true;
		const comparison = Array.from(allKeys).map((key) => {
			const countInArr1 = count1[key] || 0;
			const countInArr2 = count2[key] || 0;
			if (countInArr1 !== countInArr2) {
				allCountsEqual = false;
			}
			return {
				element: key,
				countInArr1,
				countInArr2,
			};
		});

		return allCountsEqual;
	}

	function findCommonElement(arrays) {
		if (arrays.length === 0) return null;

		const [firstArray] = arrays;
		return firstArray.find((element) =>
			arrays.every((arr) => arr.includes(element))
		);
	}

	/**
	 * Deletes the selected saved game from localStorage.
	 */
	function deleteSavedGame() {
		const dropdown = document.getElementById('saved-games-dropdown');
		const selectedKey = dropdown.value;

		if (!selectedKey) {
			alert('Please select a saved game to delete.');
			return;
		}

		const confirmation = confirm(
			'Are you sure you want to delete the selected saved game? This action cannot be undone.'
		);
		if (!confirmation) return;

		localStorage.removeItem(selectedKey);
		alert('Saved game deleted successfully.');

		// Refresh the saved games list
		listSavedGames();
	}
	/**
	 * Loads the selected saved game from the dropdown.
	 */
	function loadSavedGame() {
		const dropdown = document.getElementById('saved-games-dropdown');
		const selectedKey = dropdown.value;

		if (!selectedKey) {
			alert('Please select a saved game to load.');
			return;
		}

		const config = JSON.parse(localStorage.getItem(selectedKey));

		if (!config || !config.targetCombinations) {
			alert('Invalid or corrupted saved game configuration.');
			return;
		}

		// Load the game with the saved targetCombinations
		handleConfigSubmit(JSON.stringify(config.targetCombinations), false);

		// Optionally, notify the user
		alert('Saved game loaded successfully!');
	}
	/**
	 * Lists all saved games by retrieving configurations from localStorage
	 * and populating the saved games dropdown.
	 */
	function listSavedGames() {
		const dropdown = document.getElementById('saved-games-dropdown');
		dropdown.innerHTML =
			'<option value="" disabled selected>Select a saved game</option>'; // Reset dropdown

		// Iterate through localStorage keys
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key.startsWith('vennGame_')) {
				const config = JSON.parse(localStorage.getItem(key));
				const option = document.createElement('option');
				option.value = key;
				option.textContent = `Game ${new Date(
					config.createdAt
				).toLocaleString()}`;
				dropdown.appendChild(option);
			}
		}

		// If no saved games are found
		if (dropdown.options.length === 1) {
			// Only the default option
			const option = document.createElement('option');
			option.value = '';
			option.textContent = 'No saved games found.';
			option.disabled = true;
			option.selected = true;
			dropdown.appendChild(option);
		}
	}

	function setupSavedGamesEventListeners() {
		const loadGameButton = document.getElementById('show-saved-games');
		const deleteGameButton = document.getElementById('delete-saved-game');

		loadGameButton.addEventListener('click', loadSavedGame);
		deleteGameButton.addEventListener('click', deleteSavedGame);
	}
	// Initialize all event listeners when the DOM is fully loaded
	setupEventListeners();

	//   handleConfigSubmit(JSON.stringify([
	//     ["Animal","Chicken","Eagle","Parrot","Penguin"],
	//     ["Animal","Bat","Dolphin","Goldfish","Penguin"],
	//     ["Animal","Cat","Dog","Goldfish","Parrot"]
	// ]))
});
