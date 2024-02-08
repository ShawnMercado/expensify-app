/* eslint-disable no-underscore-dangle */
import {Video} from 'expo-av';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View} from 'react-native';
import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';
import Hoverable from '@components/Hoverable';
import {usePlaybackContext} from '@components/VideoPlayerContexts/PlaybackContext';
import VideoPopoverMenu from '@components/VideoPopoverMenu';
import useThemeStyles from '@hooks/useThemeStyles';
import useWindowDimensions from '@hooks/useWindowDimensions';
import addEncryptedAuthTokenToURL from '@libs/addEncryptedAuthTokenToURL';
import * as DeviceCapabilities from '@libs/DeviceCapabilities';
import {videoPlayerDefaultProps, videoPlayerPropTypes} from './propTypes';
import VideoPlayerControls from './VideoPlayerControls';

function BaseVideoPlayer({
    url,
    resizeMode,
    onVideoLoaded,
    isLooping,
    style,
    videoPlayerStyle,
    videoStyle,
    videoControlsStyle,
    videoDuration,
    shouldUseSharedVideoElement,
    shouldUseSmallVideoControls,
    // TODO: investigate what is the root cause of the bug with unexpected video switching
    // isVideoHovered caused a bug with unexpected video switching. We are investigating the root cause of the issue,
    // but current workaround is just not to use it here for now. This causes not displaying the video controls when
    // user hovers the mouse over the carousel arrows, but this UI bug feels much less troublesome for now.
    // eslint-disable-next-line no-unused-vars
    isVideoHovered,
}) {
    const styles = useThemeStyles();
    const {isSmallScreenWidth} = useWindowDimensions();
    const {playVideo, currentlyPlayingURL, updateSharedElements, sharedElement, originalParent, shareVideoPlayerElements, currentVideoPlayerRef} = usePlaybackContext();
    const [duration, setDuration] = useState(videoDuration * 1000);
    const [position, setPosition] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const videoPlayerRef = useRef(null);
    const videoPlayerElementParentRef = useRef(null);
    const videoPlayerElementRef = useRef(null);
    const sharedVideoPlayerParentRef = useRef(null);
    const [sourceURL] = useState(url.includes('blob:') ? url : addEncryptedAuthTokenToURL(url));
    const [isPopoverVisible, setIsPopoverVisible] = useState(false);
    const [popoverAnchorPosition, setPopoverAnchorPosition] = useState({horizontal: 0, vertical: 0});
    const canUseTouchScreen = DeviceCapabilities.canUseTouchScreen();

    const showPopoverMenu = (e) => {
        setPopoverAnchorPosition({horizontal: e.nativeEvent.pageX, vertical: e.nativeEvent.pageY});
        setIsPopoverVisible(true);
    };

    const hidePopoverMenu = () => {
        setIsPopoverVisible(false);
    };

    const onPlaybackStatusUpdate = useCallback((e) => {
        const isVideoPlaying = e.isPlaying || false;
        setIsPlaying(isVideoPlaying);
        setIsLoading(Number.isNaN(e.durationMillis)); // when video is ready to display duration is not NaN
        setDuration(e.durationMillis || videoDuration * 1000);
        setPosition(e.positionMillis || 0);
    }, []);

    const bindFunctions = useCallback(() => {
        currentVideoPlayerRef.current._onPlaybackStatusUpdate = onPlaybackStatusUpdate;
        // update states after binding
        currentVideoPlayerRef.current.getStatusAsync().then((status) => {
            onPlaybackStatusUpdate(status);
        });
    }, [currentVideoPlayerRef, onPlaybackStatusUpdate]);

    // update shared video elements
    useEffect(() => {
        if (shouldUseSharedVideoElement || url !== currentlyPlayingURL) {
            return;
        }
        shareVideoPlayerElements(videoPlayerRef.current, videoPlayerElementParentRef.current, videoPlayerElementRef.current);
    }, [currentlyPlayingURL, shouldUseSharedVideoElement, shareVideoPlayerElements, updateSharedElements, url]);

    // append shared video element to new parent (used for example in attachment modal)
    useEffect(() => {
        if (url !== currentlyPlayingURL || !sharedElement || !shouldUseSharedVideoElement) {
            return;
        }

        const newParentRef = sharedVideoPlayerParentRef.current;
        videoPlayerRef.current = currentVideoPlayerRef.current;
        if (currentlyPlayingURL === url) {
            newParentRef.appendChild(sharedElement);
            bindFunctions();
        }
        return () => {
            if (!originalParent && !newParentRef.childNodes[0]) {
                return;
            }
            originalParent.appendChild(sharedElement);
        };
    }, [bindFunctions, currentVideoPlayerRef, currentlyPlayingURL, isSmallScreenWidth, originalParent, sharedElement, shouldUseSharedVideoElement, url]);
    return (
        <>
            <Hoverable>
                {(isHovered) => (
                    <View style={[styles.w100, styles.h100, style]}>
                        {shouldUseSharedVideoElement ? (
                            <>
                                <View
                                    ref={sharedVideoPlayerParentRef}
                                    style={[styles.flex1]}
                                />
                                {/* We are adding transparent absolute View between appended video component and control buttons to enable
                                    catching onMouse events from Attachment Carousel. Due to late appending React doesn't handle
                                    element's events properly. */}
                                <View style={[styles.w100, styles.h100, styles.pAbsolute]} />
                            </>
                        ) : (
                            <View
                                style={styles.flex1}
                                ref={(el) => {
                                    if (!el) {
                                        return;
                                    }
                                    videoPlayerElementParentRef.current = el;
                                    if (el.childNodes && el.childNodes[0]) {
                                        videoPlayerElementRef.current = el.childNodes[0];
                                    }
                                }}
                            >
                                <View style={styles.flex1}>
                                    <Video
                                        ref={videoPlayerRef}
                                        style={videoPlayerStyle || [styles.w100, styles.h100]}
                                        videoStyle={videoStyle || [styles.w100, styles.h100]}
                                        source={{
                                            uri: sourceURL,
                                        }}
                                        shouldPlay={false}
                                        useNativeControls={false}
                                        resizeMode={resizeMode}
                                        isLooping={isLooping}
                                        onReadyForDisplay={onVideoLoaded}
                                        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
                                        onFullscreenUpdate={(event) => {
                                            // fix for iOS native and mWeb: when switching to fullscreen and then exiting
                                            // the fullscreen mode while playing, the video pauses
                                            if (!event.status.isPlaying) {
                                                return;
                                            }
                                            playVideo();
                                        }}
                                    />
                                </View>
                            </View>
                        )}

                        {isLoading && <FullScreenLoadingIndicator style={[styles.opacity1, styles.bgTransparent]} />}

                        {!isLoading && (isPopoverVisible || isHovered || canUseTouchScreen) && (
                            <VideoPlayerControls
                                duration={duration}
                                position={position}
                                url={url}
                                videoPlayerRef={videoPlayerRef}
                                isPlaying={isPlaying}
                                small={shouldUseSmallVideoControls}
                                style={videoControlsStyle}
                                showPopoverMenu={showPopoverMenu}
                            />
                        )}
                    </View>
                )}
            </Hoverable>
            <VideoPopoverMenu
                isPopoverVisible={isPopoverVisible}
                hidePopover={hidePopoverMenu}
                anchorPosition={popoverAnchorPosition}
            />
        </>
    );
}

BaseVideoPlayer.propTypes = videoPlayerPropTypes;
BaseVideoPlayer.defaultProps = videoPlayerDefaultProps;
BaseVideoPlayer.displayName = 'BaseVideoPlayer';

export default BaseVideoPlayer;
