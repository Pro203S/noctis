# NoctUI - 기본 사용법

NoctUI를 사용해보고 싶으시군요!  
여기서는 `TypeScript` 기준으로 설명하겠습니다.  

## 패키지 설치

`npm install noctui`

## 렌더링

아래 예제 코드로 렌더를 할 수 있습니다.  

```tsx
import NoctUI, { Text } from "noctui";

const noctui = new NoctUI();

noctui.setTitle("NoctUI Test");
noctui.render(<Text>You just rendered a Text component!</Text>);
```

`new NoctUI()`는 렌더러의 새 인스턴스를 생성합니다.  
`noctui.setTitle`는 창의 이름을 설정합니다.  
`noctui.render`는 인수로 주어진 ReactNode를 렌더링합니다.  
React에서 웹 페이지 렌더링 할 때는 `createRoot(...).render(<App />);`를 썼던 것처럼 여기서는 `noctui.render(<App />)`을 사용합니다.  

## 예제 프로젝트 구조

프로젝트의 폴더 구조가 아래 처럼 되어있다고 가정합니다.  

```
src/
├── app/
│   └── index.tsx
└── index.tsx
```

### src/index.tsx

```tsx
import NoctUI from "noctui";
import App from "./app/index.js";

const noctui = new NoctUI();

noctui.setTitle("NoctUI Test");
noctui.render(<App />);
```

### src/app/index.tsx

```tsx
import { View, Text } from "noctui";

export default function App() {
    return <View>
        <Text>hehehehehe</Text>
    </View>;
}
```

이렇게 코드를 작성해주시고, `src/index.tsx`를 실행해주시면 `hehehehehe`이 출력됩니다.  
`Ctrl+C`를 눌러 프로그램을 종료할 수 있어요.  

## 더 읽어보기

* [훅](./HOOKS.md)
