'use client';

import React, { useState } from 'react';
import PencilIcon from '@/app/_components/icons/PencilIcon';
import EraserIcon from '@/app/_components/icons/EraserIcon';

interface SketchCanvasToolbarProps {
    tool?: 'pen' | 'eraser' | '';
    onClearAll?: () => void;
    onUndo?: () => void;
    onToolChange?: (tool: 'pen' | 'eraser' | '') => void;
}

export default function SketchCanvasToolbar({
    tool,
    onClearAll,
    onUndo,
    onToolChange
}: SketchCanvasToolbarProps) {
    const handleClearAll = () => {
        if (onClearAll) {
            onClearAll();
        }
    };

    const handleUndo = () => {
        if (onUndo) {
            onUndo();
        }
    };

    return (
        <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center">
            <div className="rounded-full h-20 bg-white flex items-center justify-center px-5 gap-4"
                style={{ boxShadow: '0px 0px 10px 0px rgba(0, 0, 0, 0.1)' }}>

                <div className="gap-2 flex items-center">
                    <button
                        onClick={handleClearAll}
                        className=" hover:bg-gray-50 rounded-full transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 28 28" fill="none">
                            <path d="M13.9912 22.7422C18.9746 22.7422 23.0879 18.6289 23.0879 13.6543C23.0879 8.67969 18.9658 4.56641 13.9824 4.56641C9.00781 4.56641 4.90332 8.67969 4.90332 13.6543C4.90332 18.6289 9.0166 22.7422 13.9912 22.7422ZM10.9941 17.4863C10.5283 17.4863 10.1592 17.1172 10.1592 16.6426C10.1592 16.4316 10.2471 16.2207 10.4141 16.0625L12.8047 13.6631L10.4141 11.2725C10.2471 11.1143 10.1592 10.9033 10.1592 10.6924C10.1592 10.2178 10.5283 9.85742 10.9941 9.85742C11.2402 9.85742 11.4336 9.93652 11.5918 10.0947L13.9912 12.4854L16.3994 10.0859C16.5752 9.91895 16.7598 9.83984 16.9971 9.83984C17.4629 9.83984 17.832 10.209 17.832 10.6748C17.832 10.8945 17.7441 11.0879 17.5771 11.2637L15.1865 13.6631L17.5771 16.0537C17.7354 16.2207 17.8232 16.4229 17.8232 16.6426C17.8232 17.1172 17.4541 17.4863 16.9795 17.4863C16.7422 17.4863 16.54 17.3984 16.373 17.2402L13.9912 14.8584L11.6094 17.2402C11.4512 17.4072 11.2402 17.4863 10.9941 17.4863Z" fill="#CDCED0" />
                        </svg>
                    </button>

                    <button
                        onClick={handleUndo}
                        className=" hover:bg-gray-50 rounded-full transition-colors"
                    >
                        <svg style={{ marginRight: -4 }} xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 28 28" fill="none">
                            <path d="M13.9912 22.6455C18.9746 22.6455 23.0879 18.5322 23.0879 13.5576C23.0879 8.57422 18.9658 4.46094 13.9824 4.46094C9.00781 4.46094 4.90332 8.57422 4.90332 13.5576C4.90332 18.5322 9.0166 22.6455 13.9912 22.6455ZM18.7109 14.6387C18.7109 16.8447 17.1377 18.2334 14.9844 18.2334H13.71C13.2529 18.2334 12.9277 17.9697 12.9277 17.5127C12.9277 17.0557 13.2529 16.792 13.6924 16.792H14.9844C16.2939 16.792 17.2256 15.9482 17.2256 14.5859C17.2256 13.2412 16.2676 12.4854 14.9844 12.4854H12.2861L11.3105 12.4414L11.8379 12.8281L12.9277 13.8301C13.0684 13.9619 13.1387 14.1465 13.1387 14.3223C13.1387 14.7266 12.8223 15.043 12.4443 15.043C12.251 15.043 12.0752 14.9727 11.9434 14.8408L9.5 12.3535C9.3418 12.1865 9.24512 11.9932 9.24512 11.7734C9.24512 11.5625 9.35059 11.3604 9.5 11.2021L11.9346 8.73242C12.0664 8.58301 12.2422 8.52148 12.4355 8.52148C12.8223 8.52148 13.1387 8.83789 13.1387 9.2334C13.1387 9.42676 13.0596 9.61133 12.9189 9.72559L11.9961 10.6133L11.3105 11.1406L12.2861 11.0967H14.9844C17.1465 11.0967 18.7109 12.4502 18.7109 14.6387Z" fill="#CDCED0" />
                        </svg>
                    </button>
                </div>

                <div className="gap-5 flex items-center h-full px-5 overflow-hidden">
                    <button
                        onClick={() => onToolChange?.(tool === 'pen' ? '' : 'pen')}
                        className={`${tool === 'pen' ? 'mt-6' : 'mt-14'} transition-all ease-in-out duration-90 hover:opacity-80`}
                    >
                        <PencilIcon />
                    </button>
                    <button
                        onClick={() => onToolChange?.(tool === 'eraser' ? '' : 'eraser')}
                        className={`${tool === 'eraser' ? 'mt-6' : 'mt-14'} transition-all ease-in-out duration-90 hover:opacity-80`}
                    >
                        <EraserIcon />
                    </button>
                </div>
            </div>
        </div>
    );
}