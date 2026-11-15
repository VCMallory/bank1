import FinanceApp from './FinanceApp';
import { useKeyboard } from './mobile';
export default function Prototype() {
  const keyboard = useKeyboard();
  return <FinanceApp onNavigate={keyboard.hide}/>;
}
