import { Component,type ReactNode } from 'react';
export class ErrorBoundary extends Component<{children:ReactNode},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return{failed:true};}
  render(){if(this.state.failed)return <main className="startup"><h1>화면을 표시하지 못했습니다.</h1><p>저장 자료를 삭제하거나 샘플로 덮어쓰지 않았습니다. 새로고침해 다시 확인하세요. 문제가 반복되면 지원을 요청하세요.</p><button onClick={()=>location.reload()}>다시 열기</button></main>;return this.props.children;}
}
