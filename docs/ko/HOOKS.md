# NoctUI - React 훅

NoctUI에서는 아래 훅들을 사용할 수 있습니다.  

* `useConsoleSize`
* `useCursor`
* `useInput`
* `useMouse`

그외 React에서 기본으로 제공되는 `useState`, `useEffect`는 당연히 사용 가능합니다.  

## useConsoleSize

`useConsoleSize` 훅은 아래와 같이 사용합니다.  

```tsx
import { View, Text, useConsoleSize } from "noctui";

export default function App() {
    const { width, height } = useConsoleSize();

    return <View>
        <Text>size: {width}, {height}</Text>
    </View>;
}
```

콘솔의 현재 행을 width로, 열을 height로 반환합니다.  

## useCursor

`useCursor` 훅은 아래와 같이 사용합니다.  

```tsx
import { View, Text, useCursor } from "noctui";
import { useEffect } from "react";

export default function App() {
    const cursor = useCursor({ "show": true });

    useEffect(() => {
        cursor.setX(10);
        cursor.setY(10);
    }, []);

    return <View>
        <Text>useCursor Example</Text>
    </View>;
}
```

`useCursor`는 아래와 같은 타입을 반환합니다.  

```typescript
type useCursorReturn = {
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
    setX: React.Dispatch<React.SetStateAction<number>>;
    setY: React.Dispatch<React.SetStateAction<number>>;
    show: boolean;
    x: number;
    y: number;
}
```

## useInput

`useInput` 훅은 아래와 같이 사용할 수 있습니다.  

```tsx
import { View, Text, useInput } from "noctui";

export default function App() {
    const input = useInput();

    return <View>
        <Text>{input ? JSON.stringify(input, null, 4) : "Press a key"}</Text>
    </View>;
}
```

`stdin`으로 **키보드 키**가 입력 되면 아래 타입으로 업데이트됩니다.  

```typescript
type PressedKey = {
    name: string;
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
    meta: boolean;
};
```

## useMouse

`useMouse` 훅은 아래와 같이 사용할 수 있습니다.

```tsx
import { View, Text, useMouse } from "noctui";

export default function App() {
    const mouse = useMouse();

    return <View>
        <Text>{mouse ? JSON.stringify(mouse, null, 4) : "Try using your mouse in the terminal"}</Text>
    </View>;
}
```

`stdin`으로 마우스 관련 이벤트가 들어오면 아래 타입으로 업데이트됩니다.  

```typescript
type MouseInput = {
    x: number;
    y: number;
    button: "left" | "middle" | "right" | "none" | "wheelUp" | "wheelDown";
    action: "press" | "release" | "move" | "drag" | "scroll";
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
};
```

마우스 엄지 버튼은 지원하지 않습니다.

## 더 읽어보기

* [NoctUI 기본](./BASICS.md)
