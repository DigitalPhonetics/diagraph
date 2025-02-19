import { Dictionary } from "@reduxjs/toolkit";
import {  useCallback, useEffect, useState } from "react";

const blacklistedTargets = ["INPUT", "TEXTAREA"];

function disabledEventPropagation(e: Event){
    if(e){
        e.preventDefault();
      if(e.stopPropagation){
        e.stopPropagation();
      } else if(window.event){
        window.event.cancelBubble = true;
      }
    }
  }

const useKeyboardShortcut = (shortcutKeys: Array<string>, callback: Function, overrideSystem: boolean) => {


    const initalKeyMapping = shortcutKeys.reduce((currentKeys: Dictionary<boolean>, key:string) => {
      currentKeys[key.toLowerCase()] = false;
      return currentKeys;
    }, {});
  
    const [keys, setKeys] = useState(initalKeyMapping);
  
    const keydownListener = useCallback(
      assignedKey => (keydownEvent: any) => {
        const loweredKey = assignedKey.toLowerCase();
        
        if (keydownEvent.repeat) return
        if (blacklistedTargets.includes(keydownEvent.target.tagName)) return;
        if (loweredKey !== keydownEvent.key.toLowerCase()) return;
        if (keys[loweredKey] === undefined) return;
  
        if (overrideSystem) {
          keydownEvent.preventDefault();
          disabledEventPropagation(keydownEvent);
        }
  
        setKeys(prevState => ({
            ...prevState,
            [loweredKey]: true}));
        return false;
      },
      [keys, overrideSystem]
    );

    const keyupListener = useCallback(
      assignedKey => (keyupEvent: any) => {
        const raisedKey = assignedKey.toLowerCase();
  
        if (blacklistedTargets.includes(keyupEvent.target.tagName)) return;
        if (keyupEvent.key.toLowerCase() !== raisedKey) return;
        if (keys[raisedKey] === undefined) return;
  
        if (overrideSystem) {
          keyupEvent.preventDefault();
          disabledEventPropagation(keyupEvent);
        }
  
        setKeys(prevState => ({
            ...prevState,
            [raisedKey]: false}));
        return false;
      },
      [keys, overrideSystem]
    );
  
    useEffect(() => {
      if (!Object.values(keys).filter(value => !value).length) {
        callback(keys);
        setKeys(initalKeyMapping);
      } 
    }, [callback, initalKeyMapping, keys]);
  
    useEffect(() => {
      shortcutKeys.forEach(k => window.addEventListener("keydown", keydownListener(k)));
      shortcutKeys.forEach(k => window.addEventListener("keyup", keyupListener(k)));
      return () =>{ 
        shortcutKeys.forEach(k => window.removeEventListener("keydown", keydownListener(k)));
        shortcutKeys.forEach(k => window.removeEventListener("keyup", keyupListener(k)));};
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
  };
  
  export default useKeyboardShortcut;

