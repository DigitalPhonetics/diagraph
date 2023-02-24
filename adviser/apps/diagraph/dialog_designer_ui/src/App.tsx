/** @jsxImportSource @emotion/react */
import React, { useEffect, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import "bootstrap-icons/font/bootstrap-icons.css";
import { StoreProvider } from 'easy-peasy';
import { store, useStoreState } from './store/store';
import { ReactFlowProvider } from 'react-flow-renderer';
import ChatWindow from './chat/ChatWindow';
import DialogEditor from './dialogeditor/DialogEditor';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import styles from "./styles.module.css";



function MyResizeHandle({
  className = "",
  id
}: {
  className?: string;
  id?: string;
}) {
  return (
    <PanelResizeHandle
      className={[styles.ResizeHandleOuter, className].join(" ")}
      id={id}
    >
      <div className={styles.ResizeHandleInner}>
        <svg className={styles.Icon} viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M8,18H11V15H2V13H22V15H13V18H16L12,22L8,18M12,2L8,6H11V9H2V11H22V9H13V6H16L12,2Z"
          />
        </svg>
      </div>
    </PanelResizeHandle>
  );
}

function PanelView() {
  const showDebug = useStoreState((state) => state.showDebugMenu);
  const hideDebug = useStoreState((state) => state.hideDebugMenu);
  const panelRef = useRef<any>();

  const showPanel = useEffect(() => {
    panelRef.current?.expand();
  }, [showDebug]);

  const hidePanel = useEffect(() => {
    panelRef.current?.collapse();
  }, [hideDebug]);

  return (
    <PanelGroup direction="horizontal">
      <Panel defaultSize={70} minSize={25}>
        <div className="App">
          <DialogEditor/>
        </div>
      </Panel>
      <MyResizeHandle />
      <Panel ref={panelRef} collapsible={true} defaultSize={30}>
        <ChatWindow/>
      </Panel>
  </PanelGroup>
  );
}

function App() {
  return (
    <StoreProvider store={store}>
       <ReactFlowProvider>
        <PanelView/>
      </ReactFlowProvider>
    </StoreProvider>
  );
}

export default App;
