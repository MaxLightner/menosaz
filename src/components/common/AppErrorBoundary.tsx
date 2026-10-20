import React from 'react';

type State = {error: Error | null};

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = {error: null};

  static getDerivedStateFromError(error: Error): State {
    return {error};
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Mizato application error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main dir="rtl" style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#faf7f2',fontFamily:'sans-serif',padding:24,color:'#292524'}}>
        <section style={{maxWidth:540,width:'100%',padding:28,borderRadius:16,background:'#fff',boxShadow:'0 5px 25px #0001'}}>
          <h1 style={{fontSize:24,margin:'0 0 12px'}}>میزاتو در بارگذاری صفحه با مشکل روبه‌رو شد</h1>
          <p>صفحه را دوباره بارگذاری کنید. اگر مشکل ادامه داشت، متن خطای زیر را برای پشتیبانی بفرستید.</p>
          <pre dir="ltr" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',background:'#f5f5f4',borderRadius:8,padding:12,fontSize:12}}>{this.state.error.message}</pre>
          <button onClick={()=>window.location.reload()} style={{border:0,borderRadius:8,padding:'12px 20px',background:'#1c1917',color:'#fff',cursor:'pointer'}}>تلاش دوباره</button>
        </section>
      </main>
    );
  }
}
