import Image from 'next/image'

export const Header = () => {
    return (
        <header className="flex justify-end gap-5">
            <div className="flex items-center gap-3 h-20">
                {/* <div className="w-20 h-20 rounded-full">
                    <Image src="/Ellipse 1.svg" alt="User Avatar" width={213} height={100} className="mr-2" />
                </div>
                <span className="text-2xl font-bold text-foreground">
                    <span className="text-muted-foreground">Hello, </span>
                    Lydia!
                </span> */}
            </div>
        </header>
    )
}