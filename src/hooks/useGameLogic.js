import { useState, useEffect } from "react";
export const useGameLogic = (cardValues) => {
    const [cards, setCards] = useState([]);
    const [flippedCards, setFlippedCards] = useState([]);
    const [matchedCards, setMatchedCards] = useState([]);
    const [score, setScore] = useState(0);
    const [moves, setMoves] = useState(0);
    const [isLocked, setIsLocked] = useState(false);

    const shuffleArray = (array) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    const shuffleUnmatchedCards = (currentCards) => {
        const unmatchedIndices = [];
        const unmatchedCards = [];

        currentCards.forEach((card, index) => {
            if (!card.isMatched) {
                unmatchedIndices.push(index);
                unmatchedCards.push(card);
            }
        });

        const shuffledUnmatched = shuffleArray(unmatchedCards);
        const newCardsArray = [...currentCards];

        unmatchedIndices.forEach((index, i) => {
            newCardsArray[index] = shuffledUnmatched[i];
        });

        return newCardsArray;
    };

    const initializeGame = () => {
        const shuffled = shuffleArray(cardValues);
        const finalCards = shuffled.map((value, index) => ({
            id: index,
            value,
            isFlipped: false,
            isMatched: false,
        }));
        setCards(finalCards);
        setScore(0);
        setMoves(0);
        setFlippedCards([]);
        setMatchedCards([]);
        setIsLocked(false);
    };

    useEffect(() => {
        initializeGame();
    }, []);

    const handleClick = (card) => {
        if (
            card.isFlipped ||
            card.isMatched ||
            isLocked ||
            flippedCards.length === 2
        ) {
            return;
        }
        setCards((prev) =>
            prev.map((c) => (c.id === card.id ? { ...c, isFlipped: true } : c)),
        );

        const newFlippedCards = [...flippedCards, card.id];
        setFlippedCards(newFlippedCards);

        if (newFlippedCards.length === 2) {
            setIsLocked(true);

            const firstCard = cards.find((c) => c.id === newFlippedCards[0]);

            if (firstCard.value === card.value) {
                setTimeout(() => {
                    setMatchedCards((prev) => [...prev, firstCard.id, card.id]);
                    setCards((prev) => {
                        const updatedCards = prev.map((c) => {
                            if (c.id === card.id || c.id === firstCard.id) {
                                return { ...c, isMatched: true };
                            }
                            return c;
                        });
                        return shuffleUnmatchedCards(updatedCards);
                    });
                    setFlippedCards([]);
                    setScore((score) => score + 1);
                    setIsLocked(false);
                }, 500);
            } else {
                setTimeout(() => {
                    setCards((prevCards) => {
                        return prevCards.map((c) => {
                            if (newFlippedCards.includes(c.id)) {
                                return { ...c, isFlipped: false };
                            }
                            return c;
                        });
                    });
                    setTimeout(() => {
                        setCards((prevCards) => shuffleUnmatchedCards(prevCards));
                        setFlippedCards([]);
                        setIsLocked(false);
                    }, 300);
                }, 700);
            }
            setMoves((moves) => moves + 1);
        }
    };
    const isGameCompleted = matchedCards.length === cardValues.length;

    return { score, moves, initializeGame, cards, handleClick, isGameCompleted };
}