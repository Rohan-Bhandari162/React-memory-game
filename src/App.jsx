import { useState, useEffect } from "react";
import { GameHeader } from "./components/GameHeader";
import { Card } from "./components/Card";
import { WinMessage } from "./components/WinMessage";
import { useGameLogic } from "./hooks/useGameLogic";

const cardValues = [
	"🍎",
	"🍎",
	"🍌",
	"🍌",
	"🍓",
	"🍓",
	"🍊",
	"🍊",
	"🥝",
	"🥝",
	"🍑",
	"🍑",
	"🍉",
	"🍉",
	"🍍",
	"🍍",
];

function App() {
	const { score, moves, initializeGame, cards, handleClick, isGameCompleted } =
		useGameLogic(cardValues);
	return (
		<>
			<GameHeader score={score} moves={moves} onReset={initializeGame} />
			{isGameCompleted && <WinMessage moves={moves} />}
			<div className="cards-grid">
				{cards.map((card) => (
					<Card key={card.id} card={card} onClick={handleClick} />
				))}
			</div>
		</>
	);
}

export default App;
