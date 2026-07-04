'use client';

import { Button } from '@/components/ui/button';
import { QUIZ_QUESTIONS, useQuizStore } from '@/stores/useQuizStore';

function resultComment(correctCount: number): string {
  if (correctCount === QUIZ_QUESTIONS.length) return '地球内部の専門家です!';
  if (correctCount >= 5) return 'かなりの理解度です';
  return 'ガイドツアーでおさらいしてみましょう';
}

export default function QuizPanel() {
  const active = useQuizStore((s) => s.active);
  const currentIndex = useQuizStore((s) => s.currentIndex);
  const selectedIndex = useQuizStore((s) => s.selectedIndex);
  const correctCount = useQuizStore((s) => s.correctCount);
  const finished = useQuizStore((s) => s.finished);
  const startQuiz = useQuizStore((s) => s.startQuiz);
  const answer = useQuizStore((s) => s.answer);
  const nextQuestion = useQuizStore((s) => s.nextQuestion);
  const exitQuiz = useQuizStore((s) => s.exitQuiz);

  if (!active) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          学んだことをクイズで確かめましょう(全7問)。
        </p>
        <Button size="sm" className="w-full" onClick={startQuiz}>
          クイズを始める
        </Button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">
          7問中 {correctCount} 問正解!
        </p>
        <p className="text-xs text-muted-foreground">{resultComment(correctCount)}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={startQuiz}>
            もう一度
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={exitQuiz}>
            閉じる
          </Button>
        </div>
      </div>
    );
  }

  const q = QUIZ_QUESTIONS[currentIndex];
  const isLast = currentIndex >= QUIZ_QUESTIONS.length - 1;
  const answered = selectedIndex !== null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          問 {currentIndex + 1} / {QUIZ_QUESTIONS.length}
        </p>
        <Button size="icon-xs" variant="ghost" onClick={exitQuiz} aria-label="やめる">
          ✕
        </Button>
      </div>

      <p className="text-sm font-medium">{q.question}</p>

      <div className="flex flex-col gap-1.5">
        {q.choices.map((choice, i) => {
          const isCorrect = i === q.correctIndex;
          const isSelected = i === selectedIndex;
          let extraClass = '';
          if (answered && isCorrect) {
            extraClass = 'border-green-500 text-green-400';
          } else if (answered && isSelected) {
            extraClass = 'border-red-500 text-red-400';
          }
          return (
            <Button
              key={i}
              size="sm"
              variant="outline"
              disabled={answered}
              className={`w-full justify-start text-left whitespace-normal ${extraClass}`}
              onClick={() => answer(i)}
            >
              {choice}
            </Button>
          );
        })}
      </div>

      {answered && (
        <div aria-live="polite" className="flex flex-col gap-1">
          <p className="text-xs font-medium">
            {selectedIndex === q.correctIndex ? '正解!' : '残念…'}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">{q.explanation}</p>
        </div>
      )}

      <Button size="sm" className="w-full" disabled={!answered} onClick={nextQuestion}>
        {isLast ? '結果を見る' : '次の問題へ'}
      </Button>
    </div>
  );
}
