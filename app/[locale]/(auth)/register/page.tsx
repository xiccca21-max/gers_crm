import { RegisterComponent } from "./components/RegisterComponent";

const RegisterPage = async () => {
  return (
    <div className="h-full w-full flex flex-col items-center">
      <div className="py-10">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          {process.env.NEXT_PUBLIC_APP_NAME}
        </h1>
      </div>
      <RegisterComponent />
    </div>
  );
};

export default RegisterPage;
