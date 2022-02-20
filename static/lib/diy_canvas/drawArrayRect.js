export function drawArrayRect(ctx, position, arr, style = { rectColor: "#0055ff", rectSize: [50, 50], fontColor: "#ffff00", fontSize: 30, fontFamily: "Consola" }) {
    const interval = 4;
    for (let index = 0; index < arr.length; index++) {
        ctx.fillStyle = style.rectColor;
        ctx.fillRect(
            position[0] + index * (interval + style.rectSize[0]),
            position[1],
            style.rectSize[0],
            style.rectSize[1]
        );
        ctx.font = `${style.fontSize}px ${style.fontFamily}`;
        ctx.fillStyle = style.fontColor;
        let fontX = position[0] + style.rectSize[0] / 2 + index * (interval + style.rectSize[0]);
        if (arr[index] >= 0 && arr[index] < 10) {
            fontX -= style.fontSize / 4;
        } else if (arr[index] >= 10 && arr[index] <= 99) {
            fontX -= style.fontSize / 2;
        }
        ctx.fillText(
            arr[index],
            fontX,
            position[1] + style.rectSize[1] / 2 + style.fontSize / 3
        );
    }
}
