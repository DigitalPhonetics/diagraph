import React, { memo } from 'react';
import { EdgeProps, getMarkerEnd, Position, getEdgeCenter } from 'react-flow-renderer';

interface GetBezierPathParams {
  sourceX: number;
  sourceY: number;
  sourcePosition?: Position;
  targetX: number;
  targetY: number;
  targetPosition?: Position;
  centerX?: number;
  centerY?: number;
}

export function getBezierPath({
  sourceX,
  sourceY,
  sourcePosition = Position.Bottom,
  targetX,
  targetY,
  targetPosition = Position.Top,
}: GetBezierPathParams): string {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [_centerX, _centerY, _offsetX, _offsetY] = getEdgeCenter({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });

  const scale =  _offsetX > 100? 40 : 20;
	let ctrl1_x = _offsetX? sourceX + scale*Math.cbrt(_offsetX) : sourceX + 175;
	let ctrl2_x = _offsetY? targetX + 6 - scale*Math.cbrt(_offsetX) : targetX + 6 - 175;
  
	let path = `M${sourceX},${sourceY} C${ctrl1_x},${sourceY} ${ctrl2_x},${targetY} ${targetX+6},${targetY}`;

  return path;
}

export default memo(
  ({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition = Position.Bottom,
    targetPosition = Position.Top,
    label,
    labelStyle,
    labelShowBg,
    labelBgStyle,
    labelBgPadding,
    labelBgBorderRadius,
    style,
    arrowHeadType,
    markerEndId,
  }: EdgeProps) => {
    const path = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });

    const markerEnd = getMarkerEnd(arrowHeadType, markerEndId);
    return (
        <path style={style} d={path} className="react-flow__edge-path" markerEnd={markerEnd} />
    );
  }
);