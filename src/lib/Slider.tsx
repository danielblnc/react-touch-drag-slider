import React, {
  useState,
  useRef,
  useLayoutEffect,
  useEffect,
  useCallback,
} from 'react'
import Slide from './Slide'
import { getElementDimensions, getPositionX } from '../utils'
import './Slider.styles.css'

interface SliderProps {
  children: JSX.Element[]
  onSlideComplete?: (index: number) => void
  onSlideStart?: (index: number) => void
  activeIndex?: number | null
  threshHold?: number
  transition?: number
  scaleOnDrag?: boolean
}

function Slider({
  children,
  onSlideComplete,
  onSlideStart,
  activeIndex = null,
  threshHold = 100,
  transition = 0.3,
  scaleOnDrag = false,
}: SliderProps) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  const dragging = useRef(false)
  const startPos = useRef(0)
  const currentTranslate = useRef(0)
  const prevTranslate = useRef(0)
  const currentIndex = useRef<number | null>(0)
  const sliderRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)

  const setPositionByIndex = useCallback(
    (w = dimensions.width) => {
      currentTranslate.current = currentIndex.current! * -w
      prevTranslate.current = currentTranslate.current
      setSliderPosition()
    },
    [dimensions.width]
  )

  const transitionOn = () => {
    if (sliderRef.current)
      sliderRef.current.style.transition = `transform ${transition}s ease-out`
  }

  const transitionOff = () => {
    if (sliderRef.current) sliderRef.current.style.transition = 'none'
  }

  // watch for a change in activeIndex prop
  useEffect(() => {
    if (activeIndex !== currentIndex.current) {
      transitionOn()
      currentIndex.current = activeIndex
      setPositionByIndex()
    }
  }, [activeIndex, setPositionByIndex])

  // set width after first render
  // set position by startIndex
  // no animation on startIndex
  useLayoutEffect(() => {
    if (sliderRef.current) {
      setDimensions(getElementDimensions(sliderRef.current))

      setPositionByIndex(getElementDimensions(sliderRef.current).width)
    }
  }, [setPositionByIndex])

  // add event listeners
  useEffect(() => {
    // set width if window resizes
    const handleResize = () => {
      transitionOff()
      if (sliderRef.current) {
        const { width, height } = getElementDimensions(sliderRef.current)
        setDimensions({ width, height })
        setPositionByIndex(width)
      }
    }

    const handleKeyDown = ({ key }: KeyboardEvent) => {
      // HACK: Non-Null Assertion operator
      const arrowsPressed = ['ArrowRight', 'ArrowLeft'].includes(key)
      if (arrowsPressed) transitionOn()
      if (arrowsPressed && onSlideStart) {
        onSlideStart(currentIndex.current!)
      }
      if (key === 'ArrowRight' && currentIndex.current! < children.length - 1) {
        currentIndex.current! += 1
      }
      if (key === 'ArrowLeft' && currentIndex.current! > 0) {
        currentIndex.current! -= 1
      }
      if (arrowsPressed && onSlideComplete)
        onSlideComplete(currentIndex.current!)
      setPositionByIndex()
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [children.length, setPositionByIndex, onSlideComplete, onSlideStart])

  function touchStart(index: number) {
    return function (event: React.TouchEvent | React.MouseEvent) {
      transitionOn()
      currentIndex.current = index
      startPos.current = getPositionX(event)
      dragging.current = true
      animationRef.current = requestAnimationFrame(animation)
      if (sliderRef.current) sliderRef.current.style.cursor = 'grabbing'
      // if onSlideStart prop - call it
      if (onSlideStart) onSlideStart(currentIndex.current)
    }
  }

  function touchMove(event: React.TouchEvent | React.MouseEvent) {
    if (dragging.current) {
      const currentPosition = getPositionX(event)
      currentTranslate.current =
        prevTranslate.current + currentPosition - startPos.current
    }
  }

  function touchEnd() {
    // HACK: Non-Null Assertion operator
    transitionOn()
    cancelAnimationFrame(animationRef.current!)
    dragging.current = false
    const movedBy = currentTranslate.current - prevTranslate.current

    // if moved enough negative then snap to next slide if there is one
    if (movedBy < -threshHold && currentIndex.current! < children.length - 1)
      currentIndex.current! += 1

    // if moved enough positive then snap to previous slide if there is one
    if (movedBy > threshHold && currentIndex.current! > 0)
      currentIndex.current! -= 1

    transitionOn()

    setPositionByIndex()
    sliderRef.current!.style.cursor = 'grab'
    // if onSlideComplete prop - call it
    if (onSlideComplete) onSlideComplete(currentIndex.current!)
  }

  function animation() {
    setSliderPosition()
    if (dragging.current) requestAnimationFrame(animation)
  }

  function setSliderPosition() {
    if (!sliderRef.current) return
    sliderRef.current.style.transform = `translateX(${currentTranslate.current}px)`
  }

  return (
    <div className='rtds-slider-wrapper'>
      <div ref={sliderRef} className='rtds-slider-styles'>
        {children.map((child, index) => {
          return (
            <div
              key={child.key}
              onTouchStart={touchStart(index)}
              onMouseDown={touchStart(index)}
              onTouchMove={touchMove}
              onMouseMove={touchMove}
              onTouchEnd={touchEnd}
              onMouseUp={touchEnd}
              onMouseLeave={() => {
                if (dragging.current) touchEnd()
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              className='slide-outer'
            >
              <Slide
                child={child}
                sliderWidth={dimensions.width}
                sliderHeight={dimensions.height}
                scaleOnDrag={scaleOnDrag}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Slider
