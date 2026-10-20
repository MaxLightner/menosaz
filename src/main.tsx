import {AppErrorBoundary} from './components/common/AppErrorBoundary';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './catalog.css';
import './brand.css';
import './operations.css';

createRoot(document.getElementById('root')!).render(<AppErrorBoundary><App /></AppErrorBoundary>);

